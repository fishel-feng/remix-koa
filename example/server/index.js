const path = require("path");
const Koa = require("koa");
const compress = require("koa-compress");
const morgan = require("koa-morgan");
const static = require('koa-static');
const { createRequestHandler } = require('remix-koa');

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

let app = new Koa();
app.use(compress());

// You may want to be more aggressive with this caching
app.use(
  static("public", { maxAge: 3600000, setHeaders: setCustomCacheControl })
);

app.use(morgan("tiny"));
app.use(
  MODE === "production"
    ? createRequestHandler({ build: require("./build") })
    : (ctx, next) => {
        purgeRequireCache();
        let build = require("./build");
        return createRequestHandler({ build, mode: MODE })(ctx, next);
      }
);

let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Koa server listening on port ${port}`);
});

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}

const remixBuildPath = path.join(process.cwd(), "public", "build");
function setCustomCacheControl(res, filePath) {
  // Remix fingerprints its assets so we can cache forever
  if (filePath.startsWith(remixBuildPath)) {
    res.set("Cache-Control", `max-age=${60 * 60 * 24 * 365},immutable`);
  }
}
