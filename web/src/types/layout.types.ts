import type { Component } from 'vue'
import type { RouteLocationNamedRaw } from 'vue-router'

export type TvNavItemT = {
    title: string;
    icon: string;
    expandable?: boolean;
    expanded?: boolean;
    to?: RouteLocationNamedRaw;
    component?: Component;
};
