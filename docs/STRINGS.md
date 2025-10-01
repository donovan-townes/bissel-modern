# STRINGS

This document describes how to manage user-facing strings in the bot. How to add, edit, and test them. However, it does not describe the implementation details of the string system itself; see the devlog for that.

## Overview

All user-facing copy is stored in JSON files under `config/strings/en/`. Each file corresponds to a "topic" (e.g., `errors.json`, `commands.json`, `lfg.json`).
The files are namespaced by topic to keep things organized.
The bot currently supports only English (`en`), but the structure allows for easy addition of other languages in the future (e.g., `config/strings/es/` for Spanish).

The bot loads these JSON files at startup and provides a helper function `t(key, params)` to retrieve strings by key, with optional parameter interpolation and random selection from arrays for variety.

## Editing Strings

To edit user-facing strings, follow these steps:

1. Open the relevant JSON file in `config/strings/en/`. For example, to edit error messages, open `errors.json`.
2. Locate the key you want to change. Keys are nested according to their topic. For
    example, the key for a guild-only error message might look like this:

    ```json
    {
      "errors": {
         "permission": {
            "guild_member_only": "This command can only be used by guild members."
         }
      }
    }
    ```

3. Modify the string value as needed. You can also add new keys or topics by following the existing structure.
4. Save the file.
5. Restart the bot to see your changes take effect. In the future, a `/strings reload` command may be available to reload strings without restarting.

*Example:*

```json
{
  "errors": {
    "permission": {
      "guild_member_only": "This command can only be used by guild members."
    }
  }
}
