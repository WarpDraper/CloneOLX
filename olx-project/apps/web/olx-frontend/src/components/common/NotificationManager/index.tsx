import React, { useEffect } from 'react';
import { notification } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { clearPopupFlag } from '../../../store/notificationSlice';

const NotificationManager: React.FC = () => {
  const [api, contextHolder] = notification.useNotification();
  const dispatch = useDispatch();
  const { items } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    // Find notifications that need to be shown as a popup
    const popupsToRun = items.filter(n => n.showPopup);

    if (popupsToRun.length > 0) {
      popupsToRun.forEach(n => {
        // Trigger the antd notification UI
        api[n.type]({
          message: n.title,
          description: n.message,
          placement: 'bottomRight',
          duration: 5,
        });
        
        // Immediately clear the flag so it doesn't pop up again
        dispatch(clearPopupFlag(n.id));
      });
    }
  }, [items, api, dispatch]);

  return <>{contextHolder}</>;
};

export default NotificationManager;
