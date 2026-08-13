import React from 'react';
import { Result } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => {
    const { t } = useTranslation();
    return (
        <Result
            icon={<ToolOutlined className="text-mm-purple" />}
            title={title}
            subTitle={t('admin.comingSoon.subtitle')}
        />
    );
};

export default ComingSoonPage;
