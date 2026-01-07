import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = "https://chat.barzakh.tech";
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/private/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
