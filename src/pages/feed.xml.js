import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  const sortedPosts = posts.sort((a, b) => {
    const [ay, am, ad] = a.slug.split('-');
    const [by, bm, bd] = b.slug.split('-');
    return new Date(`${by}-${bm}-${bd}`).getTime() - new Date(`${ay}-${am}-${ad}`).getTime();
  }).reverse();

  return rss({
    title: "Andrea Cognolato's Blog",
    description: 'my blog',
    site: context.site,
    items: sortedPosts.map((post) => {
      const [year, month, day, ...rest] = post.slug.split('-');
      const slug = rest.join('-');
      return {
        title: post.data.title,
        pubDate: new Date(`${year}-${month}-${day}`),
        link: `/${year}/${month}/${day}/${slug}.html`,
      };
    }),
  });
}
