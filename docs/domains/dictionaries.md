# Metadata-Backed Dictionaries

## Scope

Dictionary values such as employee grades, roles, and skillsets are managed through the Metadata module rather than hardcoded enums.

## Supported dictionary types

- `grade`
- `role`
- `skillset`

These types are exposed through:

- `GET /metadata/dictionaries`
- `POST /metadata/dictionaries/{type}/entries`

## Design rules

- dictionaries remain metadata records, not special-case domain tables
- entries are created against existing metadata dictionaries
- new values become visible through the same metadata read APIs
- no business enums are introduced into the employee domain for these values

## Current dictionary model

The supported employee dictionaries are represented as `MetadataDictionary` records with:

- `entityType = Person`
- `dictionaryKey` equal to the route type (`grade`, `role`, `skillset`)

## Entry creation rules

- dictionary type must be supported
- dictionary must exist
- `entryKey`, `entryValue`, and `displayName` are required
- `entryKey` must be unique within the dictionary
- `sortOrder` defaults to the next available position if omitted
