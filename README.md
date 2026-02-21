# Disclaimer

This project is 99% done by AI.

I've been a software engineer for a decade, but it was at a megacorp with its own infrastructure and I don't know how to operate in the real world.\
Futhermore, I exclusively worked on backends.

I don't know react. I don't know javascript. I don't know css. I don't know supabase.

[I do not know best practices for any of this](https://media1.tenor.com/m/cq_SQD8rA9sAAAAd/itysl-i-think-you-should-leave.gif), and the code shouldn't be used as an example for ANYTHING.

Hopefully, the app itself is useful.

# Mutual Aid Library of Things

General idea is to make a decentralized library of things.

If you need a thing, you can get it from the library.

If you have things that you're not using, you can let others borrow them.

React app connected to Supabase for storage.

## Possible future work

* ~~Support for groups, e.g. so you can share with just your immediate neighbors~~ (done: create groups, invite link, share things with groups, browse public groups)
* Just generally better UI
* Integrate sending requests instead of users providing contact info
* Searching or filtering thing list based on distance
* Support adding pictures of things

Below is some AI stuff that's hopefully useful.

## Supabase setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and get your project URL and anon key (Project Settings → API).

2. **Create `.env.local`** in the project root with:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

3. TODO: there are more tables/columns now **Create the `items` table** in the Supabase SQL Editor (if needed):
   ```sql
   create table items (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     description text
   );

   alter table items enable row level security;
   create policy "Allow public read" on items for select using (true);
   ```

4. **Groups and sharing:** Run the migrations in `supabase/migrations/` in order (001 then 002) in the Supabase SQL Editor. 001 creates `groups`, `group_members`, `things_to_groups`, adds `is_public` to `items`, and sets up RLS. 002 adds `latitude` and `longitude` to `profiles` for the user’s location (one location per user; used on the Thing library map).

5. Restart the dev server after changing env vars (`npm start`).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
