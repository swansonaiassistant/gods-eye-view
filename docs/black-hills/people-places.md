# NPS People & Places for the Black Hills research panel

The official [NPS API](https://www.nps.gov/subjects/developer/api-documentation.htm) publishes editorial People and Places assets. NPS calls People assets historically significant biographical sketches; Places assets describe significant locations. The opt-in panel queries one selected nearby park at a time: Mount Rushmore (`moru`), Wind Cave (`wica`), Jewel Cave (`jeca`), Minuteman Missile (`mimi`), or Badlands (`badl`). These are a research selection, not a claim that the park boundaries define the Black Hills.

## Access and rights

NPS [requires an API key](https://www.nps.gov/subjects/developer/guides.htm) for these endpoints. [Registration is free](https://www.nps.gov/subjects/developer/get-started.htm), but the owner must register or supply a key. There is no NPS key in the checked workstation `.env`; an unrelated Google or OpenAI key cannot authenticate with NPS. Configure `NPS_API_KEY` only in the local server environment. Do not put it in a `VITE_` variable, browser request, share link, screenshot, or repository. The proxy uses `X-Api-Key` and a fixed NPS host with allowlisted resource/park values. A missing key shows a clear unavailable state.

NPS [encourages use of API content in apps](https://www.nps.gov/subjects/digital/nps-data-api.htm), but its [disclaimer](https://www.nps.gov/aboutus/disclaimer.htm) warns that some content, especially photos, can have third-party rights. This feature fetches short descriptions and links at runtime, does not bundle or display NPS photos, and credits NPS with a direct source link for each result. No archival redistribution is implied.

## Geography and privacy

People are cards only. Their API coordinates may refer to a birth, death, burial, or associated place and are **never** treated as a person's position. Place pins appear only when NPS supplies coordinates in the broad regional box, does not mark the pin hidden, and does not mark the place closed to public access. These points do not establish site extents, historical positions, or current accessibility. No inferred homes, routes, or private-person tracking are included.

## Current verification limit

The official schema, key policy, rate limits, attribution, and failure cases were reviewed on 2026-11-19. The server proxy, panel, and regression tests are implemented, but there is no configured NPS key, so no live People/Places response or real NPS pin has been verified. Keep PR #10 draft until a key is provided, a real response for relevant parks is inspected, the browser shows its actual records and place points, and the required full test/build/tracking gates pass on the final head. A zero-result NPS response is a valid result; do not add invented profiles or coordinates to make the panel look populated.
