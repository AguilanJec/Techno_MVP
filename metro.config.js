const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add .mjs support if needed
config.resolver.sourceExts.push("mjs");

// Custom resolver to block certain files only for web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Only block files for web
    if (platform === "web") {
        if (
            moduleName.endsWith("map.native.tsx") ||
            moduleName.endsWith("edit_address.tsx") ||
            moduleName.endsWith("location.tsx")
        ) {
            // Return a dummy empty module
            return {
                type: "sourceFile",
                filePath: path.resolve(__dirname, "empty-web-stub.js"),
            };
        }
    }

    // fallback to default resolver
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
