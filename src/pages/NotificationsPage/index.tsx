import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Pagination } from "antd";
import { BellOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { RootState } from "../../store";
import {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
} from "../../services/notificationService";
import type { INotification } from "../../services/notificationService";

const PAGE_SIZE = 15;

// Dedicated /notifications feed (Facebook/OLX-style): full history, paginated, with a
// "mark all as read" action and read/unread visual differentiation. The header bell (Header.tsx)
// only ever shows the top 3 unread — this page is where the full list lives.
const NotificationsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuth } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const [page, setPage] = useState(1);

    const { data, isLoading, isFetching } = useGetNotificationsQuery(
        { page, pageSize: PAGE_SIZE },
        { skip: !isAuth }
    );
    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const hasUnread = items.some((n) => !n.isRead);

    const handleItemClick = (item: INotification) => {
        if (!item.isRead) markAsRead(item.id);
        if (item.targetUrl) navigate(item.targetUrl);
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    if (!isAuth) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-mm-navy dark:text-white">
                    {t("notificationsPage.title")}
                </h1>
                {hasUnread && (
                    <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        disabled={isMarkingAll}
                        className="flex items-center gap-1.5 text-sm font-semibold text-mm-purple hover:text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircleOutlined />
                        {t("notificationsPage.markAllRead")}
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
                {isLoading ? (
                    <p className="text-center text-gray-400 dark:text-neutral-500 py-16">
                        {t("notificationsPage.loading")}
                    </p>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                        <div className="w-16 h-16 rounded-full bg-mm-lavender dark:bg-neutral-800 flex items-center justify-center mb-4">
                            <BellOutlined className="text-2xl text-mm-purple" />
                        </div>
                        <p className="font-semibold text-mm-navy dark:text-white mb-1">
                            {t("notificationsPage.emptyTitle")}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-neutral-500">
                            {t("notificationsPage.emptyDescription")}
                        </p>
                    </div>
                ) : (
                    <div
                        className={`flex flex-col divide-y divide-gray-100 dark:divide-neutral-800 transition-opacity ${
                            isFetching ? "opacity-60" : "opacity-100"
                        }`}
                    >
                        {items.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className={`flex items-start gap-3 px-4 md:px-5 py-4 transition-colors ${
                                    item.targetUrl ? "cursor-pointer" : ""
                                } ${
                                    !item.isRead
                                        ? "bg-blue-50/10 dark:bg-blue-900/20 hover:bg-blue-50/40 dark:hover:bg-blue-900/30"
                                        : "hover:bg-gray-50 dark:hover:bg-neutral-800/60"
                                }`}
                            >
                                <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-mm-purple" style={{ visibility: item.isRead ? "hidden" : "visible" }} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={`text-sm text-mm-navy dark:text-white ${!item.isRead ? "font-bold" : "font-medium"}`}>
                                            {item.title}
                                        </p>
                                        <span className="text-xs text-gray-400 dark:text-neutral-500 shrink-0 whitespace-nowrap">
                                            {formatDate(item.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                                        {item.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {total > PAGE_SIZE && (
                <div className="flex justify-center mt-6">
                    <Pagination
                        current={page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        onChange={setPage}
                        showSizeChanger={false}
                    />
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
