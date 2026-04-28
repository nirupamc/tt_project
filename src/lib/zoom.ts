export type ZoomAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type CreateMeetingOptions = {
  topic: string;
  start_time: string; // ISO string
  duration?: number; // minutes
  settings?: Record<string, unknown>;
};

async function fetchJson(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON response from ${url}: ${text}`);
  }
}

export async function getZoomAccessToken(): Promise<ZoomAccessTokenResponse> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom env variables: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET');
  }

  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
    accountId,
  )}`;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const payload = await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!payload || !payload.access_token) {
    throw new Error(`Failed to obtain Zoom access token: ${JSON.stringify(payload)}`);
  }

  return {
    access_token: payload.access_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in,
  };
}

export async function createZoomMeeting(
  opts: CreateMeetingOptions,
  accessToken?: string,
) {
  // Acquire token if not provided
  let token = accessToken;
  if (!token) {
    const t = await getZoomAccessToken();
    token = t.access_token;
  }

  const meetingPayload: any = {
    topic: opts.topic,
    type: 2,
    start_time: opts.start_time,
    duration: opts.duration ?? 60,
    settings: Object.assign(
      {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        waiting_room: false,
      },
      opts.settings || {},
    ),
  };

  const url = 'https://api.zoom.us/v2/users/me/meetings';
  const payload = await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingPayload),
  });

  if (!payload || !payload.id) {
    throw new Error(`Failed to create Zoom meeting: ${JSON.stringify(payload)}`);
  }

  return payload; // includes join_url, id, password, etc.
}
