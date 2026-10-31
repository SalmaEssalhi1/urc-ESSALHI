import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});
console.log("Diagnostic Redis API :", {
    urlPresent: Boolean(process.env.KV_REST_API_URL),
    tokenPresent: Boolean(process.env.KV_REST_API_TOKEN),
    urlLength: process.env.KV_REST_API_URL?.length ?? 0,
    tokenLength: process.env.KV_REST_API_TOKEN?.length ?? 0,
});

export async function getConnecterUser(request) {
    const authorization =
    typeof request.headers?.get === "function"
        ? request.headers.get("Authorization")
        : request.headers?.authorization ?? request.headers?.Authorization;

    if (!authorization) {
        return null;
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return null;
    }

    const token = match[1];
    const user = await redis.get(token);

    if (!user) {
        return null;
    }

    console.log("Got user : " + user.username);
    return user;
}
export async function checkSession(request) {
    const user = await getConnecterUser(request);
    // console.log(user);
    return (user !== undefined && user !== null && user);
}

export function unauthorizedResponse() {
    const error = {code: "UNAUTHORIZED", message: "Session expired"};
    return new Response(JSON.stringify(error), {
        status: 401,
        headers: {'content-type': 'application/json'},
    });
}

export function triggerNotConnected(res) {
    res.status(401).json("{code: \"UNAUTHORIZED\", message: \"Session expired\"}");
}