import React, { useState } from 'react';
import { CarOutlined, EnvironmentOutlined, PhoneOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGetWarehousesBySettlementQuery } from '../../../services/newPostService';
import SettlementPicker from '../../../components/location/SettlementPicker';
import WarehouseMapPicker from '../../../components/location/WarehouseMapPicker';

// Nova Poshta branch picker for the profile page (formerly the generic "OLX Доставка" tab).
// Reuses the same SettlementPicker + WarehouseMapPicker + NewPostController-backed
// getWarehousesBySettlement query already powering delivery selection at checkout (CartPage),
// so users can browse/pick their preferred Nova Poshta office straight from their profile.
const NovaPoshtaDeliveryPanel: React.FC = () => {
    const { t } = useTranslation();
    const [settlementRef, setSettlementRef] = useState('');
    const [settlementDescription, setSettlementDescription] = useState('');
    const [selectedWarehouseRef, setSelectedWarehouseRef] = useState('');

    const { data: warehouses = [], isLoading } = useGetWarehousesBySettlementQuery(settlementRef, { skip: !settlementRef });
    const selectedWarehouse = warehouses.find((w) => w.ref === selectedWarehouseRef);

    return (
        <div className="bg-white rounded shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-[#002f34] mb-1 flex items-center gap-2">
                <CarOutlined /> {t('userProfile.tabs.delivery')}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
                {t('userProfile.novaPoshta.description')}
            </p>

            <div className="max-w-md mb-6">
                <SettlementPicker
                    value={settlementRef}
                    displayValue={settlementDescription || undefined}
                    onChange={(ref, descr) => {
                        setSettlementRef(ref);
                        setSettlementDescription(descr);
                        setSelectedWarehouseRef('');
                    }}
                    label={t('settlementPicker.defaultLabel')}
                />
            </div>

            {!settlementRef && (
                <div className="text-center text-gray-400 py-10 border border-dashed border-gray-200 rounded-lg">
                    {t('userProfile.novaPoshta.selectSettlementFirst')}
                </div>
            )}

            {settlementRef && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                    <WarehouseMapPicker
                        warehouses={warehouses}
                        value={selectedWarehouseRef}
                        onChange={setSelectedWarehouseRef}
                        className="w-full h-96 rounded-lg overflow-hidden border border-gray-200"
                    />

                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                        {isLoading && <p className="text-sm text-gray-400 py-4 text-center">{t('userProfile.novaPoshta.loadingWarehouses')}</p>}
                        {!isLoading && warehouses.length === 0 && (
                            <p className="text-sm text-gray-400 py-4 text-center">{t('userProfile.novaPoshta.noWarehousesFound')}</p>
                        )}
                        {warehouses.map((w) => (
                            <button
                                key={w.ref}
                                type="button"
                                onClick={() => setSelectedWarehouseRef(w.ref)}
                                className={`text-left border rounded-lg px-3 py-2 text-sm transition-colors ${
                                    w.ref === selectedWarehouseRef
                                        ? 'border-mm-purple bg-mm-lavender text-mm-purple'
                                        : 'border-gray-200 text-mm-navy hover:border-mm-purple'
                                }`}
                            >
                                <div className="flex items-start gap-1.5 font-medium">
                                    <EnvironmentOutlined className="mt-0.5 shrink-0" />
                                    <span>{w.description}</span>
                                </div>
                                {w.phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                        <PhoneOutlined /> {w.phone}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedWarehouse && (
                <div className="mt-4 flex items-start gap-2 bg-mm-lavender-light border border-purple-100 rounded-lg px-4 py-3 text-sm text-mm-navy">
                    <CheckCircleFilled className="text-mm-purple mt-0.5 shrink-0" />
                    <span>
                        {t('userProfile.novaPoshta.selectedWarehousePrefix')} <strong>{selectedWarehouse.description}</strong>
                    </span>
                </div>
            )}
        </div>
    );
};

export default NovaPoshtaDeliveryPanel;
