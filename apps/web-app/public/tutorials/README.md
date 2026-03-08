# Tutorial Media Assets

Add Phase 3 mini-video assets in this folder.

## Phase/Branch Status

- ✅ Main phase/branch: `feature/how-to-tutorial`
- ✅ Phase 1 branch: `feature/how-to-tutorial-p1`
- ✅ Phase 2 branch: `feature/how-to-tutorial-p2`
- ✅ Phase 3 branch: `feature/how-to-tutorial-p3`

## Missing Items (Must Be Completed)

- `.mp4` videos
- Poster images (`.jpg`) for all cards are still missing.
  Path: `posters`
- Caption tracks should be finalized against the real recordings.
  You have `.vtt` files now, but they are placeholder timing/text and should be aligned to final videos.
  Paths:
  `captions/en`
  `captions/it`
- Final QA pass after media drop:
  - verify tracks load/default by language (`en`/`it`)
  - verify fallback behavior still works
  - verify `change-password` card in `feature/user-password` flow

## Video files

Place these `.mp4` files in `apps/web-app/public/tutorials/`:

- `add-book.mp4`
- `edit-book.mp4`
- `delete-book.mp4`
- `scanner.mp4`
- `assign-author-category.mp4`
- `add-author-category.mp4`
- `manage-author-category.mp4`
- `change-password.mp4`

## Poster files

Place these `.jpg` files in `apps/web-app/public/tutorials/posters/`:

- `add-book.jpg`
- `edit-book.jpg`
- `delete-book.jpg`
- `scanner.jpg`
- `assign-author-category.jpg`
- `add-author-category.jpg`
- `manage-author-category.jpg`
- `change-password.jpg`

## Caption tracks

Place these `.vtt` files in `apps/web-app/public/tutorials/captions/en/`:

- `add-book.vtt`
- `edit-book.vtt`
- `delete-book.vtt`
- `scanner.vtt`
- `assign-author-category.vtt`
- `add-author-category.vtt`
- `manage-author-category.vtt`
- `change-password.vtt`

Place the translated `.vtt` files in `apps/web-app/public/tutorials/captions/it/` with the same names.

If an asset is missing, the UI will show a fallback message for that video card.
