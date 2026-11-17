# @repo/ui

The UI component kit from [ui.siteplane.io](https://ui.siteplane.io/docs/), installed as editable source with the shadcn CLI. Components are in `src/components` and the shared system (styles, providers, utils) is in `src/system`. Components are used by `apps/web`.

## Usage

Import the stylesheet once, first, in the app's global CSS:

```css
@import "@repo/ui/styles.css";
```

Wrap the app in the provider and import components by path:

```tsx
import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { UIProvider } from "@repo/ui/provider";
```

The app also needs the Inter font (`@fontsource-variable/inter`) and `data-theme="light"` on `<html>`.

## Adding components

Run from this directory. The `@ui` registry is declared in `components.json`:

```sh
pnpm dlx shadcn@4.18.0 add @ui/<name>
```

The CLI installs the component's package dependencies (it updates `package.json`). Components import each other with relative paths, so no import alias is needed.

## Updating

The registry hard-codes its install folder as `src/siteplane/...`, so the CLI writes there rather than to `src/components` and `src/system`. After each install, move the new output up one level and delete the empty folder:

```sh
mv src/siteplane/components src/components && mv src/siteplane/system src/system && rmdir src/siteplane
```

If `src/components` and `src/system` already exist, move the new files over them. Use `--overwrite` to replace files that changed. Review the diff first, and reinstall every item you use in the same run.

## Notes

- Pro patterns (`@ui-pro`) need a license key and are not installed.
- `tsconfig.json` disables `noUncheckedSideEffectImports` because the kit imports its CSS files as side effects.
- `src/components/**` and `src/system/**` are excluded from `oxfmt` (see the root `.oxfmtrc.json`), so the installed source stays identical to the registry and reinstalls produce a clean diff.
