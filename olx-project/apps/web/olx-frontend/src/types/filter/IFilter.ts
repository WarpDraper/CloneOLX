import type { IFilterValue } from "../advert/IFilterValue";

export interface IFilter {
    id: number;
    name: string;
    values?: IFilterValue[];
}
