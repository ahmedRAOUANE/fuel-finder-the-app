export interface NavItem {
    label: string;
    href: string;
    icon: string;
}

export function buildAdminNavItems(adminId: string): NavItem[] {
    return [
        { label: "لوحة التحكم", href: `/admin/${adminId}`, icon: "dashboard" },
        {
            label: "المحطات",
            href: `/admin/${adminId}/stations`,
            icon: "local_gas_station",
        },
        {
            label: "التقارير",
            href: `/admin/${adminId}/reports`,
            icon: "flag",
        },
        { label: "الفريق", href: `/admin/${adminId}/team`, icon: "group" },
    ];
}

export function buildUserNavItems(userId: string): NavItem[] {
    return [
        { label: "لوحة التحكم", href: `/user/${userId}`, icon: "dashboard" },
        {
            label: "الإشعارات",
            href: `/user/${userId}/notifications`,
            icon: "notifications",
        },
        { label: "الدعوات", href: `/user/${userId}/invitations`, icon: "mail" },
    ];
}

export function buildOwnerNavItems(stationPublicId: string): NavItem[] {
    return [
        {
            label: "لوحة التحكم",
            href: `/station/${stationPublicId}/owner`,
            icon: "dashboard",
        },
        {
            label: "الفريق",
            href: `/station/${stationPublicId}/owner/team`,
            icon: "group",
        },
        {
            label: "الوقود",
            href: `/station/${stationPublicId}/owner/fuel`,
            icon: "local_gas_station",
        },
        {
            label: "الخدمات",
            href: `/station/${stationPublicId}/owner/services`,
            icon: "handyman",
        },
        {
            label: "الساعات",
            href: `/station/${stationPublicId}/owner/hours`,
            icon: "schedule",
        },
        {
            label: "الحالة",
            href: `/station/${stationPublicId}/status`,
            icon: "info",
        },
    ];
}

export function buildManagerNavItems(stationPublicId: string): NavItem[] {
    return [
        {
            label: "لوحة التحكم",
            href: `/station/${stationPublicId}/manager`,
            icon: "dashboard",
        },
        {
            label: "الحالة",
            href: `/station/${stationPublicId}/status`,
            icon: "info",
        },
    ];
}

export function buildStaffNavItems(stationPublicId: string): NavItem[] {
    return [
        {
            label: "لوحة التحكم",
            href: `/station/${stationPublicId}/staff`,
            icon: "dashboard",
        },
        {
            label: "الحالة",
            href: `/station/${stationPublicId}/status`,
            icon: "info",
        },
    ];
}