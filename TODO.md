## Bugs

- [ ] "Something looks wrong" diagnosis reported as not saving. Live-tested the full flow against the
      real Firebase project (upload → real OpenAI diagnosis → Save to plant → hard reload) twice and
      it persisted correctly both times, so this may already be resolved (possibly by the
      `382f381` OpenAI-structured-outputs fix) or may be intermittent / tied to a specific plant or
      photo. Needs repro steps from Jason (which plant, roughly when, any visible error) to pin down.

## Features

## Enhancements

- [ ] Nocturne redesign, web-width layouts (from `Plant Care app redesign.zip`, screen 7): the
      Today and Plants screens still render their mobile stacked layout at desktop width. The mock
      calls for a distinct wide layout — a 3-up grid for due cards, and a two-column split (a
      `.table` of all plants beside a "Latest diagnosis" card) — behind the shared sidebar shell
      that's already in place.
