import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { useSetNewsletterSubscriptionMutation } from "../services/accountService";
import { profileService, useGetSellerProfileQuery, isOwnProfileId } from "../services/profileService";

/**
 * Single source of truth for the "subscribed to MultiMart newsletter" toggle
 * (OlxUser.NewsletterSubscribed, POST /api/account/subscribe). Shared by SettingsPage's toggle
 * and the homepage ReleaseSubscriptionWidget one-click button so a change made in either place
 * is immediately reflected in the other: both read the SAME getSellerProfile(currentUserId)
 * RTK Query cache entry (profileService — the same one useOwnProfile wraps), and toggle()
 * patches that entry in place after a successful mutation instead of only updating local
 * component state, which is what let the two surfaces drift out of sync before this hook existed.
 */
export function useNewsletterToggle() {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);
    const skip = !isOwnProfileId(currentUserId);

    const { data: profile, isLoading: isProfileLoading } = useGetSellerProfileQuery(currentUserId, { skip });
    const [setNewsletterSubscription, { isLoading: isToggling }] = useSetNewsletterSubscriptionMutation();

    const subscribed = profile?.newsletterSubscribed ?? false;

    const toggle = async (checked: boolean): Promise<boolean> => {
        const result = await setNewsletterSubscription(checked).unwrap();
        if (!skip) {
            dispatch(
                profileService.util.updateQueryData("getSellerProfile", currentUserId, (draft) => {
                    draft.newsletterSubscribed = result.subscribed;
                })
            );
        }
        return result.subscribed;
    };

    return { subscribed, toggle, isLoading: isToggling, isProfileLoading };
}
