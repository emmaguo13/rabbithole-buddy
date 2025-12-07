To create a Chrome extension to test locally: 
```
npm install
npm run build
```

This will generate a dist folder. 
Load the dist folder in chrome://extensions → Load unpacked

To build and run the server

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env before npm run dev / npm run build:next.

```
npm run build:next
npm run dev
```

Item grouping via Grok
- Set XAI_API_KEY to a Grok API token (https://docs.x.ai/docs/tutorial) before hitting the item save endpoint.
- Item saves will call Grok to decide whether to reuse an existing group or create a new one in item_groups.
