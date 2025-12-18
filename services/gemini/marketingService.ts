import { GoogleGenAI, Type } from "@google/genai";
import { SEOSuggestions, EmailCampaign } from "../../types";

// Use environment variable injected by Vite
const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error("VITE_GEMINI_API_KEY is not set!");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey as string });

export const generateSocialMediaPost = async (topic: string, platform: string): Promise<string> => {
    const prompt = `
        You are the social media manager for "TreePro AI", a professional tree care service.
        Your task is to write a social media post.

        Topic: "${topic}"
        Platform: ${platform}

        Instructions:
        - The tone should be friendly, professional, and trustworthy.
        - If the platform is Instagram or Facebook, suggest relevant hashtags (e.g., #TreeCare, #Arborist, #TreeProAI, #YourCityTreeService).
        - If the platform is Twitter, keep it concise and under 280 characters.
        - The post should be engaging and encourage interaction (e.g., asking a question, prompting a "call now").
        - End with a clear call to action.

        Generate the post text now.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
        });
        return response.text;
    } catch (error: any) {
        console.error("Error generating social media post:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate social media post: ${errorMessage}`);
    }
};

const seoSchema = {
    type: Type.OBJECT,
    properties: {
        suggested_title: {
            type: Type.STRING,
            description: "An SEO-optimized title tag for the web page, under 60 characters."
        },
        suggested_meta_description: {
            type: Type.STRING,
            description: "An SEO-optimized meta description, under 160 characters, with a call-to-action."
        },
        optimization_tips: {
            type: Type.ARRAY,
            description: "A list of actionable tips to improve the on-page SEO of the provided content.",
            items: { type: Type.STRING }
        }
    },
    required: ["suggested_title", "suggested_meta_description", "optimization_tips"]
};

export const optimizeSEOContent = async (content: string, keyword: string): Promise<SEOSuggestions> => {
    const prompt = `
        You are an SEO expert working for "TreePro AI", a tree care company.
        Analyze the following webpage content and optimize it for the target keyword.

        Target Keyword: "${keyword}"

        Webpage Content:
        """
        ${content}
        """

        Your task is to provide:
        1. A concise, compelling, and keyword-rich title tag (under 60 characters).
        2. A meta description (under 160 characters) that includes the keyword and a strong call-to-action.
        3. A list of 3-5 actionable tips for improving the content's on-page SEO (e.g., where to add the keyword, suggestions for headings, internal linking ideas).

        Return the result in the specified JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: seoSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as SEOSuggestions;
    } catch (error: any) {
        console.error("Error optimizing SEO content:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate SEO optimizations: ${errorMessage}`);
    }
};

const emailSchema = {
    type: Type.OBJECT,
    properties: {
        subject: {
            type: Type.STRING,
            description: "A compelling and concise email subject line."
        },
        body: {
            type: Type.STRING,
            description: "The full body of the email, written in a professional yet friendly tone. Use line breaks for readability."
        }
    },
    required: ["subject", "body"]
};

export const generateEmailCampaign = async (goal: string, audience: string): Promise<EmailCampaign> => {
     const prompt = `
        You are a marketing specialist for "TreePro AI", a professional tree care service.
        Your task is to write a marketing email.

        Campaign Goal: "${goal}"
        Target Audience: "${audience}"

        Instructions:
        - Write a compelling subject line that encourages opens.
        - Write the email body with a clear message.
        - The tone should be professional, helpful, and persuasive.
        - Personalize the email where appropriate (e.g., using "[Customer Name]").
        - End with a clear call-to-action (e.g., "Call us today for a free estimate!", "Visit our website to learn more.").
        - Sign off as "The Team at TreePro AI".

        Return the result in the specified JSON format.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: emailSchema
            }
        });
        const cleanedJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonText) as EmailCampaign;
    } catch (error: any) {
        console.error("Error generating email campaign:", error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        throw new Error(`Failed to generate email campaign: ${errorMessage}`);
    }
};