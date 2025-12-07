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