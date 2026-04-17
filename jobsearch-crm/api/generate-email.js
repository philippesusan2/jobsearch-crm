{
  "version": 2,
  "builds": [
    { "src": "api/*.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/scan", "dest": "/api/scan.js" },
    { "src": "/api/companies", "dest": "/api/companies.js" },
    { "src": "/api/offers", "dest": "/api/offers.js" },
    { "src": "/api/pipeline", "dest": "/api/pipeline.js" },
    { "src": "/api/import", "dest": "/api/import.js" },
    { "src": "/api/generate-email", "dest": "/api/generate-email.js" },
    { "src": "/jobradar", "dest": "/public/jobradar.html" },
    { "src": "/targetradar", "dest": "/public/targetradar.html" },
    { "src": "/", "dest": "/public/index.html" }
  ]
}
