import React, { useState } from "react";
import { Select } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useGetAreasQuery, useGetRegionsByAreaQuery, useGetSettlementsByRegionQuery, useGetSettlementByRefQuery } from "../../services/newPostService";

interface SettlementPickerProps {
    value: string;
    displayValue?: string | null;
    onChange: (ref: string, description: string) => void;
    error?: string;
    label?: string;
}

// Каскадний вибір населеного пункту (Область → Район → Місто) через реальні ендпоінти
// NewPostController: /api/newpost/areas, /areas/regions, /region/settlements.
// SettlementRef — обов'язкове поле для AdvertCreationModel і опційне для UserEditModel.
const SettlementPicker: React.FC<SettlementPickerProps> = ({ value, displayValue, onChange, error, label = "Населений пункт" }) => {
    const [isEditing, setIsEditing] = useState(!value);
    const [areaRef, setAreaRef] = useState<string | null>(null);
    const [regionRef, setRegionRef] = useState<string | null>(null);

    const { data: areas = [], isLoading: isAreasLoading } = useGetAreasQuery(undefined, { skip: !isEditing });
    const { data: regions = [], isLoading: isRegionsLoading } = useGetRegionsByAreaQuery(areaRef ?? "", { skip: !areaRef });
    const { data: settlements = [], isLoading: isSettlementsLoading } = useGetSettlementsByRegionQuery(regionRef ?? "", { skip: !regionRef });
    const { data: currentSettlement } = useGetSettlementByRefQuery(value, { skip: !value || !!displayValue });

    const resolvedDescription = displayValue ?? currentSettlement?.description ?? "";

    if (!isEditing) {
        return (
            <div className="flex flex-col gap-1">
                {label && <label className="text-sm font-medium text-mm-navy">{label}</label>}
                <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-mm-navy">
                        <EnvironmentOutlined className="text-mm-purple" />
                        {resolvedDescription || "Не вказано"}
                    </span>
                    <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-semibold text-mm-purple hover:underline shrink-0">
                        Змінити
                    </button>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {label && <label className="text-sm font-medium text-mm-navy">{label}</label>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                    showSearch
                    placeholder="Область"
                    loading={isAreasLoading}
                    value={areaRef ?? undefined}
                    optionFilterProp="label"
                    onChange={(ref) => {
                        setAreaRef(ref);
                        setRegionRef(null);
                    }}
                    options={areas.map((a) => ({ value: a.ref, label: a.description }))}
                />
                <Select
                    showSearch
                    placeholder="Район"
                    loading={isRegionsLoading}
                    disabled={!areaRef}
                    value={regionRef ?? undefined}
                    optionFilterProp="label"
                    onChange={(ref) => setRegionRef(ref)}
                    options={regions.map((r) => ({ value: r.ref, label: r.description }))}
                />
                <Select
                    showSearch
                    placeholder="Місто / село"
                    loading={isSettlementsLoading}
                    disabled={!regionRef}
                    optionFilterProp="label"
                    onChange={(ref) => {
                        const settlement = settlements.find((s) => s.ref === ref);
                        if (settlement) {
                            onChange(settlement.ref, settlement.description);
                            setIsEditing(false);
                        }
                    }}
                    options={settlements.map((s) => ({ value: s.ref, label: s.description }))}
                />
            </div>
            {value && (
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-mm-purple self-start mt-1">
                    Скасувати
                </button>
            )}
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
    );
};

export default SettlementPicker;
