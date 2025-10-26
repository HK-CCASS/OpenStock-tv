import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendNewsSummaryEmail, sendWelcomeEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";
import { getAllWatchlistSymbols, getMarketCapCache } from "@/lib/actions/heatmap.actions";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) ||'Thanks for joining Openstock. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.news' }, { cron: '0 12 * * *' } ],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email' };

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: User; articles: MarketNewsArticle[] }> = [];
            for (const user of users as User[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        // Step #3: (placeholder) Summarize news via AI
        const userNewsSummaries: { user: User; newsContent: string | null }[] = [];

        for (const { user, articles } of results) {
            try {
                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                    body: {
                        contents: [{ role: 'user', parts: [{ text:prompt }]}]
                    }
                });

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                userNewsSummaries.push({ user, newsContent });
            } catch (e) {
                console.error('Failed to summarize news for : ', user.email);
                userNewsSummaries.push({ user, newsContent: null });
            }
        }

        // Step #4: (placeholder) Send the emails
        await step.run('send-news-emails', async () => {
            await Promise.all(
                userNewsSummaries.map(async ({ user, newsContent}) => {
                    if(!newsContent) return false;

                    return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                })
            )
        })

        return { success: true, message: 'Daily news summary emails sent successfully' }
    }
)

/**
 * 每天美股收盘后更新市值缓存
 * 运行时间：每天 UTC 21:30（美东时间 16:30/17:30，收盘后 30-90 分钟）
 * 
 * 时间说明：
 * - 美股收盘：美东时间 16:00
 * - 夏令时（3-11月）：UTC 20:00 → 定时任务 UTC 21:30 = 收盘后 90 分钟
 * - 冬令时（11-3月）：UTC 21:00 → 定时任务 UTC 21:30 = 收盘后 30 分钟
 * - 对应北京时间：次日 05:30
 */
export const updateMarketCapCache = inngest.createFunction(
    { id: 'update-market-cap-cache' },
    [{ event: 'app/update.market.cap' }, { cron: '30 21 * * 1-5' }],  // 周一到周五 UTC 21:30
    async ({ step }) => {
        // Step #1: 获取所有观察列表的股票代码
        const symbols = await step.run('get-all-symbols', getAllWatchlistSymbols);

        if (!symbols || symbols.length === 0) {
            return { success: false, message: 'No symbols found in watchlists' };
        }

        console.log(`[Market Cap Update] Found ${symbols.length} unique symbols to update`);

        // Step #2: 批量更新市值缓存（分批处理，每批 100 个）
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < symbols.length; i += batchSize) {
            batches.push(symbols.slice(i, i + batchSize));
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < batches.length; i++) {
            try {
                await step.run(`update-batch-${i + 1}`, async () => {
                    const batch = batches[i];
                    await getMarketCapCache(batch);
                    return { success: true, count: batch.length };
                });
                successCount += batches[i].length;
                console.log(`[Market Cap Update] Batch ${i + 1}/${batches.length} completed (${batches[i].length} symbols)`);
            } catch (error) {
                errorCount += batches[i].length;
                console.error(`[Market Cap Update] Batch ${i + 1} failed:`, error);
            }
        }

        return {
            success: true,
            message: `Market cap cache updated: ${successCount} succeeded, ${errorCount} failed`,
            stats: {
                totalSymbols: symbols.length,
                successCount,
                errorCount,
            },
        };
    }
)