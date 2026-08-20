using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NETCore.MailKit.Core;
using Olx.BLL.DTOs.Chat;
using Olx.BLL.Entities;
using Olx.BLL.Entities.ChatEntities;
using Olx.BLL.Exceptions;
using Olx.BLL.Exstensions;
using Olx.BLL.Helpers;
using Olx.BLL.Helpers.Email;
using Olx.BLL.Hubs;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Chat;
using Olx.BLL.Models.SignaR;
using Olx.BLL.Resources;
using Olx.BLL.Specifications;
using System.Net;

namespace Olx.BLL.Services
{
    public class ChatService(
        UserManager<OlxUser> userManager,
        IHttpContextAccessor httpContext,
        IRepository<Chat> chatRepository,
        IRepository<ChatMessage> chatMessageRepository,
        IRepository<Advert> advertRepository,
        IMapper mapper,
        IHubContext<MessageHub> hubContext,
        INotificationService notificationService,
        IEmailService emailService,
        ILogger<ChatService> logger
        ) : IChatService
    {
        public async Task<Chat> CreateAsync(int advertId, string? message = null)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var advert = await advertRepository.GetItemBySpec( new AdvertSpecs.GetById(advertId))
                ?? throw new HttpException(Errors.InvalidAdvertId,HttpStatusCode.BadRequest);

            // Mirrors AdvertService.BuyAsync's "cannot buy your own advert" guard: the frontend
            // hides/disables the "Повідомлення" button for the advert owner, but that's only a UI
            // nicety — without this server-side check a direct PUT /api/Chat/create call could still
            // let a seller open a chat (and receive their own "new chat" notification/email) about
            // their own listing.
            if (advert.UserId == user.Id)
            {
                throw new HttpException(Errors.CannotMessageSelf, HttpStatusCode.BadRequest);
            }

            var chat = await chatRepository.GetItemBySpec(new ChatSpecs.FindExisting(advertId, user.Id))
                ?? new Chat() { Advert = advert, Buyer = user, SellerId = advert.UserId };
            // Captured BEFORE AddAsync: an existing chat already has a non-zero Id, a brand-new one
            // is still 0 here. Used below to fire the "New Chat Started" notification/email exactly
            // once per chat (not on every subsequent message in an already-existing conversation).
            var isNewChat = chat.Id == 0;
            if (message is not null)
            {
                chat.Messages.Add(new() { Content = message, Sender = user });
            }
            chat.IsDeletedForSeller = false;
            chat.IsDeletedForBuyer = false;
            if (chat.Id == 0)
            {
                await chatRepository.AddAsync(chat);
            }
            await chatRepository.SaveAsync();
            await hubContext.Clients.Users(advert.UserId.ToString())
                .SendAsync(HubMethods.CreateChat,chat.Id);

            // Only the very first message of a brand-new chat — never on chats that already
            // existed — to avoid spamming the seller on every reply in an ongoing conversation.
            if (isNewChat && message is not null)
            {
                await TryNotifyNewChatStartedAsync(advert, user);
            }

            return chat;
        }

        // Best-effort in-app notification + email to the seller: a failure here must never fail
        // chat creation itself, same reasoning as OrderService/AccountService's notification hooks.
        private async Task TryNotifyNewChatStartedAsync(Advert advert, OlxUser sender)
        {
            var senderName = !string.IsNullOrWhiteSpace(sender.FirstName) ? sender.FirstName : (sender.Email ?? "Покупець");

            try
            {
                await notificationService.CreateAsync(
                    advert.UserId,
                    "Нове повідомлення в чаті",
                    $"{senderName} написав(ла) вам щодо оголошення «{advert.Title}».",
                    "/chat",
                    NotificationType.NewChat);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to create new-chat notification for advert {AdvertId}", advert.Id);
            }

            try
            {
                var seller = await userManager.FindByIdAsync(advert.UserId.ToString());
                if (seller is not null && !string.IsNullOrWhiteSpace(seller.Email))
                {
                    await emailService.SendAsync(seller.Email, "Нове повідомлення на MultiMart", EmailTemplates.GetNewChatTemplate(senderName, advert.Title), true);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to send new-chat email for advert {AdvertId}", advert.Id);
            }
        }

        public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId) => await mapper.ProjectTo<ChatMessageDto>(chatMessageRepository.GetQuery().Where(x => x.ChatId == chatId)).ToArrayAsync();
       
        public async Task<IEnumerable<ChatDto>> GetUserChatsAsync(int? advertId)
        {
            var user =  await userManager.UpdateUserActivityAsync(httpContext);
            var chats = await mapper.ProjectTo<ChatDto>(chatRepository.GetQuery()
                .Where(x =>
                (x.Buyer.Id == user.Id && ((advertId.HasValue && x.AdvertId == advertId.Value) || !x.IsDeletedForBuyer)) ||
                (x.Seller.Id == user.Id && ((advertId.HasValue && x.AdvertId == advertId.Value) || !x.IsDeletedForSeller))))
                .ToArrayAsync();
            return chats;
        }

        public async Task RemoveAsync(int chatId)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var chat = await chatRepository.GetItemBySpec(new ChatSpecs.GetById(chatId))
                ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);
            chatRepository.Delete(chat);
            await chatRepository.SaveAsync();
        }
        public async Task RemoveAsync(IEnumerable<int> chatIds)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var chats = await chatRepository.GetListBySpec(new ChatSpecs.GetByIds(chatIds))
                ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);
            chatRepository.DeleteRange(chats);
            await chatRepository.SaveAsync();
        }

        public async Task RemoveForUserAsync(int chatId)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var chat = await chatRepository.GetItemBySpec(new ChatSpecs.GetById(chatId))
                ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);
            if (chat.BuyerId == user.Id)
            {
                chat.IsDeletedForBuyer = true;
            }
            else chat.IsDeletedForSeller = true;
            await chatRepository.SaveAsync();
        }

        public async Task RemoveForUserAsync(IEnumerable<int> chatIds)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var chats = await chatRepository.GetListBySpec(new ChatSpecs.GetByIds(chatIds))
                ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);

            foreach (var chat in chats)
            {
                if (chat.BuyerId == user.Id)
                {
                    chat.IsDeletedForBuyer = true;
                }
                else chat.IsDeletedForSeller = true;
            }
            await chatRepository.SaveAsync();
        }

        public async Task SendMessageAsync(int chatId, string message)
        {
            var user = await userManager.UpdateUserActivityAsync(httpContext);
            var chat = await chatRepository.GetItemBySpec(new ChatSpecs.GetById(chatId))
                ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);
            var newMessage = new ChatMessage()
            {
                Content = message,
                Sender = user
            };
            chat.Messages.Add(newMessage);

            chat.IsDeletedForBuyer = false;
            chat.IsDeletedForSeller = false;

            await chatRepository.SaveAsync();
            var receiverUserId = chat.SellerId == user.Id ? chat.BuyerId : chat.SellerId;
            await hubContext.Clients.Users(receiverUserId.ToString())
             .SendAsync(HubMethods.ReceiveChatMessage, mapper.Map<ChatMessageDto>(newMessage));
        }

        public async Task SetMessegesReadedAsync(IEnumerable<int> messagesIds,int chatId)
        {
            if (messagesIds.Any()) 
            {
                var chat = await chatRepository.GetItemBySpec(new ChatSpecs.GetById(chatId,ChatOpt.NoTracking))
                    ?? throw new HttpException(Errors.InvalidChatId, HttpStatusCode.BadRequest);
                var user = await userManager.UpdateUserActivityAsync(httpContext);
                var messeges = await chatMessageRepository.GetListBySpec(new ChatMessageSpecs.GetMesssegesById(messagesIds, true));

                await chatMessageRepository.GetQuery().Where(x => messagesIds.Contains(x.Id)).ExecuteUpdateAsync(messeges => messeges.SetProperty(x => x.Readed, true));
                var receiverUserId = chat.SellerId == user.Id ? chat.BuyerId : chat.SellerId;
                await hubContext.Clients.Users(receiverUserId.ToString())
                .SendAsync(HubMethods.SetChatMessageReaded,
                    new SetChatMessageReaded
                    {
                        MessegesIds = messeges.Select(x => x.Id).ToList(),
                        ChatId = chat.Id,
                    });
            }
        }
    }
}
