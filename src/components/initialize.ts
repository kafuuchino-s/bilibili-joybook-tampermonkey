import { GM_addStyle } from "$";
import { USER_INFO_URL } from "src/constant";
import { store } from "src/store";
import { cookie } from "src/utils/cookie";
import { cookiesReady } from "src/utils/helper";

export interface UserInfo {
	face: string;
	isLogin: boolean;
	vipStatus: number;
}

// --- UI Cookie 注入功能 ---

// 将 Cookie 字符串解析为 CbCookie 对象数组
function parseCookieString(cookieStr: string): any[] {
    const cookies = [];
    const items = cookieStr.split(';');
    for (const item of items) {
        const parts = item.split('=');
        const name = parts.shift()?.trim();
        const value = parts.join('=').trim();
        if (name && value) {
            cookies.push({
                name,
                value,
                domain: ".bilibili.com",
                path: "/",
            });
        }
    }
    return cookies;
}

function createCookieInjectorUI() {
    const { vipCookie } = store.getAll();
    // 如果已经设置了 vipCookie，则不再显示设置按钮
    if (vipCookie) {
        // 也可以在这里创建一个“清除Cookie”的按钮，提供给用户重置的功能
        return;
    }

    // 1. 创建一个悬浮按钮
    const button = document.createElement("button");
    button.textContent = "设置大会员Cookie";
    button.id = "joybook-cookie-setter";
    document.body.appendChild(button);

    // 2. 创建一个隐藏的输入框和保存按钮
    const container = document.createElement("div");
    container.id = "joybook-cookie-container";
    container.innerHTML = `
        <textarea placeholder="请在此处粘贴B站大会员的Cookie字符串"></textarea>
        <button id="joybook-save-cookie">保存</button>
        <button id="joybook-cancel-cookie">取消</button>
    `;
    document.body.appendChild(container);

    // 3. 添加样式
    GM_addStyle(`
        #joybook-cookie-setter {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px;
            background-color: #fb7299;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        #joybook-cookie-container {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            padding: 20px;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            flex-direction: column;
            gap: 10px;
        }
        #joybook-cookie-container textarea {
            width: 400px;
            height: 150px;
            font-size: 14px;
        }
    `);

    // 4. 绑定事件
    button.addEventListener("click", () => {
        container.style.display = "flex";
    });

    const saveButton = document.getElementById("joybook-save-cookie");
    const cancelButton = document.getElementById("joybook-cancel-cookie");
    const textarea = container.querySelector("textarea");

    saveButton?.addEventListener("click", () => {
        if (textarea?.value) {
            const vipCookie = parseCookieString(textarea.value);
            store.set("vipCookie", vipCookie);
            alert("大会员Cookie已保存！页面将刷新以应用。");
            window.location.reload();
        } else {
            alert("输入框不能为空！");
        }
    });

    cancelButton?.addEventListener("click", () => {
        container.style.display = "none";
    });
}


// --- 自动登录抓取功能 ---

const getUserType = async (): Promise<UserInfo> => {
	const resp = await fetch(USER_INFO_URL, {
		method: "get",
		credentials: "include",
	});
	const result = await resp.json();

	return result.data;
};

async function handleLogin(key: "vipCookie" | "userCookie"): Promise<void> {
	const storeKey = ["SESSDATA", "DedeUserID", "DedeUserID__ckMd5", "bili_jct"];

	const cookies = await cookie.get({ domain: ".bilibili.com" });

	// 储存用户 cookies
	store.set(
		key,
		cookies.filter((v) => storeKey.includes(v.name))
	);

	// 因为需要再次进行登录，所以删除浏览器 cookies
	await cookie.deleteAll();

	// 如果已完成初始化，则设置为 user cookies
	const { userCookie, vipCookie } = store.getAll();
	if (userCookie && vipCookie) {
		await cookie.set(userCookie);
	}

	window.location.reload();
}

// --- 主函数 ---

export default async () => {
    // 始终创建UI注入功能
    createCookieInjectorUI();

	// 仅在尚未通过UI设置vipCookie时，才尝试自动抓取
	const { vipCookie } = store.getAll();
	if (vipCookie) {
		console.log("[Joybook] 已存在VIP Cookie，跳过自动登录抓取。");
		return;
	}

	// 获取登录状态
	const { isLogin, vipStatus } = await getUserType();

	if (!isLogin || cookiesReady()) return;

	const user = vipStatus ? "vipCookie" : "userCookie";

	await handleLogin(user);
};
