# Feature Flag Manager

A small application for viewing, creating, and switching feature flags on and off.

## Language

**Flag**:
A named on/off switch that application code checks to decide whether a feature is active.
_Avoid_: Toggle (as a noun), feature switch, setting

**Key**:
The unique, permanent identifier of a Flag, written as a lowercase slug (e.g. `new-checkout`); it is how code refers to the Flag.
_Avoid_: Name, slug, id

**Name**:
The unique, human-readable label of a Flag (e.g. "New checkout flow"), shown to people; unlike the Key, it can change and is not how code refers to the Flag.
_Avoid_: Title, label, display name

**Deleted**:
A Flag that has been permanently retired: it no longer appears anywhere and cannot be restored, but its Key stays reserved forever and its History is kept.
_Avoid_: Archived, removed, inactive

**Change**:
One recorded modification of a Flag: which fields went from what to what, and when. A Flag's **History** is its list of Changes, newest first.
_Avoid_: Audit entry, event, log, revision

**Enabled / Disabled**:
The two states of a Flag. A newly created Flag is Disabled.
_Avoid_: On/off, active/inactive, true/false

**Toggle** (verb):
To change a Flag from Enabled to Disabled or vice versa.
_Avoid_: Flip, switch
