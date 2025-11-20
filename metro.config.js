const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("mjs");

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === "web") {
        // Block react-native-maps completely on web
        if (moduleName.startsWith("react-native-maps")) {
            return {
                type: "sourceFile",
                filePath: path.resolve(__dirname, "empty-web-stub.js"),
            };
        }

        // Block any of your native-only screens
        if (
            moduleName.endsWith("map.native.tsx") ||
            moduleName.endsWith("edit_address.tsx") ||
            moduleName.endsWith("location.tsx")
        ) {
            return {
                type: "sourceFile",
                filePath: path.resolve(__dirname, "empty-web-stub.js"),
            };
        }
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
