module.exports = {
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/proxy/*": {
    "target": "http://localhost:3000", // You need a valid target here
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "router": function(req) {
      const url = req.url.replace('/proxy/', '');
      return decodeURIComponent(url);
    }
  }
};
