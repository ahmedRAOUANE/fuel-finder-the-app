import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import {
    defaultLocale,
    isLocale,
    LOCALE_COOKIE_NAME,
} from "./config";

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

    const locale = fromCookie && isLocale(fromCookie) ? fromCookie : defaultLocale;

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});