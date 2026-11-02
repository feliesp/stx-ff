# Soft delete; keys reserved forever, names freed

Deleting a flag sets `deleted_at`: it disappears from every endpoint and can't be restored, but its row and history are kept. Its **key stays reserved forever**, because application code may still check that key and reusing it would silently bring old code paths back to life. Its **name is freed** (the case-insensitive unique index is partial, covering only flags that aren't deleted), because a name is only a label and blocking an invisible one would just confuse people.
