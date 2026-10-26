# Portfolio

Personal portfolio site: a scrolling, Nepal-inspired layout with a stamp on each project saying what is verified, in progress or planned.

The page also has a small cash-out game that seals each round with SHA-256 and checks the seal afterward, and a bestiary plate whose cat follows the pointer.

It is plain HTML, CSS and a few lines of JavaScript. There is no build step and no dependencies, so it works by opening `index.html` in a browser or from any static host.

## Layout

- `index.html` holds the content.
- `styles.css` holds the look.
- `script.js` handles the scroll reveal, the cat's eyes and the game.
- `docs/DECISIONS.md` records the design and scope decisions.

## Notes

Project descriptions cover work in progress. Kitchen-related projects use a fictional demo restaurant and menu.

## Deploying

The site is static, so any static host works. These steps use GitHub Pages.

1. In the repository settings, open Pages and choose "Deploy from a branch", branch `main`, folder `/ (root)`.
2. Wait for the first build, then open the `github.io` address it shows and check the page.

### Custom domain

1. Add a file named `CNAME` at the repository root containing only the domain, for example `www.example.com.np`, on one line with no protocol.
2. At the domain registrar, add a `CNAME` record from `www` to `<username>.github.io`. For a bare domain without `www`, use the four A records listed in the GitHub Pages documentation instead.
3. Back in the Pages settings, enter the domain and turn on "Enforce HTTPS" once the certificate is issued, which can take up to a day.

The social preview tags in `index.html` point at `og.png` with a relative path, which link-preview crawlers ignore. After the domain is live, change the `og:image` content to the full address, such as `https://www.example.com.np/og.png`.

If the registrar does not allow DNS records, change the domain's nameservers to a DNS provider that does and set the records there.
