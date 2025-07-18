import { GM_cookie, unsafeWindow } from "$";
import { cookie } from "src/utils/cookie";

export default async () => {
	// 直接设置4K画质，这样就可以默认最高画质了

	let qualityCookie = (await cookie.get({ name: "CURRENT_QUALITY" }))[0];

	if (!qualityCookie) {
		qualityCookie = {
			domain: ".bilibili.com",
			hostOnly: false,
			httpOnly: false,
			name: "CURRENT_QUALITY",
			path: "/",
			sameSite: "unspecified",
			secure: false,
			session: false,
			value: "120",
		};
	} else {
		qualityCookie.value = "120";
	}

	GM_cookie.set(qualityCookie);

	// 处理 video 画质，通过劫持 __playinfo__ 强制修改画质
	let playinfoCache: any = null;
	Object.defineProperty(unsafeWindow, "__playinfo__", {
		configurable: true,
		set(value) {
			console.log("[Joybook] Original __playinfo__ set:", value);
			// 优先使用B站返回的真实数据作为基础，避免破坏其他功能
			const info = value?.data ?? {};
			// 强行注入最高画质信息
			info.quality = 120;
			info.accept_quality = [120, 116, 80, 64, 32, 16];
			info.accept_description = ["4K", "1080P60", "1080P", "720P", "480P", "360P"];
			playinfoCache = { ...value, data: info };
			console.log("[Joybook] Modified __playinfo__ cached:", playinfoCache);
		},
		get() {
			console.log("[Joybook] __playinfo__ get:", playinfoCache);
			return playinfoCache;
		},
	});
};
