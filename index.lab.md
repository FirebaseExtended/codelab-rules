# Protect your data with Firestore Security Rules

## Before you begin

Cloud Firestore, Cloud Storage for Firebase, and the Realtime Database rely on configuration files you write to grant read and write access. That configuration, called Security Rules, can also act as a kind of schema for your app. It's one of the most important parts of developing your application. And this codelab will walk you through it.

### **Prerequisites**

* A simple editor such as Visual Studio Code, Atom, or Sublime Text
* Node.js 8.6.0 or higher (to install Node.js,  [use nvm](https://github.com/nvm-sh/nvm#installation-and-update), to check your version, run `node --version`)
* Java 7 or higher (to install Java  [use these instructions](https://java.com/en/download/help/download_options.xml), to check your version, run `java -version`)

### **What you'll do**

In this codelab, you will secure a simple blog platform built on Firestore. You will use the Firestore emulator to run unit tests against the Security Rules, and ensure that the rules allow and disallow the access you expect.

You'll learn how to:

* Grant granular permissions
* Enforce data and type validations
* Implement Attribute Based Access Control
* Grant access based on authentication method
* Create custom functions
* Create time-based Security Rules
* Implement a denylist and soft deletes
* Understand when to denormalize data to meet multiple access patterns

## Set up
Duration: 04:00

You'll focus on the backend of a blogging application. Here's a high level summary of the app's functionality:

**Draft blog posts:**
* Users can create draft blog posts, which live in the `drafts` collection.
* The author can continue to update a draft until it's ready to be published.
* When it's ready to be published, a Firebase Function is triggered that creates a new document in the `published` collection.
* Drafts can be deleted by the author or by site moderators

**Published blog posts:**
* Published posts can't be created by users, only via a function.
* They can only be soft-deleted, which updates a `visible` attribute to false.

**Comments**
* Published posts allow comments, which are a subcollection on each published post.
* To reduce abuse, users must have a verified email address and not be on a blocklist in order to leave a comment.
* Comments can only be updated for an hour after it's posted.
* Comments can be deleted by the comment author, the author of the original post, or by moderators.

In addition to access rules, you'll create Security Rules that enforce required fields and data validations.

Everything will happen locally, using the Firebase Emulator Suite.
### **Get the source code**

In this codelab, you'll start off with tests for the Security Rules, but mimimal Security Rules themselves, so the first thing you need to do is clone the source to run the tests:

```console
$ git clone https://github.com/firebase/rules-codelab.git
```

Then move into the initial-state directory, where you will work for the remainder of this codelab:

```console
$ cd rules-codelab/initial-state
```
Now, install the dependencies so you can run the tests. If you're on a slower internet connection this may take a minute or two:

```console
# Move into the functions directory, install dependencies, jump out.
$ cd functions && npm install && cd -
```

### **Get the Firebase CLI**

The Emulator Suite you'll use to run the tests is part of the Firebase CLI (command-line interface) which can be installed on your machine with the following command:

```console
$ npm install -g firebase-tools
```

Next, confirm that you have the latest version of the CLI.  This codelab should work with version 8.4.0 or higher but later versions include more bug fixes.

```console
$ firebase --version
9.2.0
```

## Run the tests
Duration: 03:00

In this section, you'll run the tests locally. This means it is time to boot up the Emulator Suite.

#### **Start the Emulators**

From inside the codelab source directory, run the following command to start the emulators:

```console
$ firebase emulators:exec --project=codelab --import=.seed "cd functions; npm test"
```

> aside positive
>
> This command passes in a made-up project id; there is no actual Firebase project with this id.
>
> Genuine project ids are generally not required for the emulators, but are required for a small number of use cases, such as users logging in or testing hosting on CI.
>
> If you're testing cases that require a real project id, you c


You should see output like this:

```console
$ firebase emulators:start --project=codelab --import=.seed
i  emulators: Starting emulators: functions, firestore, hosting
⚠  functions: The following emulators are not running, calls to these services from the Functions emulator will affect production: auth, database, pubsub
⚠  Your requested "node" version "^13.7.0" doesn't match your global version "13"
⚠  functions: Unable to fetch project Admin SDK configuration, Admin SDK behavior in Cloud Functions emulator may be incorrect.
i  firestore: Firestore Emulator logging to firestore-debug.log
⚠  hosting: Authentication error when trying to fetch your current web app configuration, have you run firebase login?
⚠  hosting: Could not fetch web app configuration and there is no cached configuration on this machine. Check your internet connection and make sure you are authenticated. To continue, you must call firebase.initializeApp({...}) in your code before using Firebase.
i  hosting: Serving hosting files from: public
✔  hosting: Local server: http://localhost:5000
i  ui: Emulator UI logging to ui-debug.log
i  functions: Watching "/Users/user/src/firebase/rules-codelab/initial-state/functions" for Cloud Functions...
✔  functions[publishPost]: http function initialized (http://localhost:5001/codelab/us-central1/publishPost).
✔  functions[softDelete]: http function initialized (http://localhost:5001/codelab/us-central1/softDelete).

┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://localhost:4000                │
└─────────────────────────────────────────────────────────────┘

┌───────────┬────────────────┬─────────────────────────────────┐
│ Emulator  │ Host:Port      │ View in Emulator UI             │
├───────────┼────────────────┼─────────────────────────────────┤
│ Functions │ localhost:5001 │ http://localhost:4000/functions │
├───────────┼────────────────┼─────────────────────────────────┤
│ Firestore │ localhost:8080 │ http://localhost:4000/firestore │
├───────────┼────────────────┼─────────────────────────────────┤
│ Hosting   │ localhost:5000 │ n/a                             │
└───────────┴────────────────┴─────────────────────────────────┘
  Emulator Hub running at localhost:4400
  Other reserved ports: 4500

Issues? Report them at https://github.com/firebase/firebase-tools/issues and attach the *-debug.log files.
```

Once you see the **All emulators ready!** message, the app is ready to use.


#### **Run the tests**
The application has three main collections: `drafts` contain blog posts that are in progress, the `published` collection contains the blog posts that have been published, and `comments` are a subcollection on published posts. The repo comes with unit tests for the Security Rules that define the user attributes and other conditions required for a user to create, read, update, and delete documents in `drafts`, `published` and `comments` collections. You'll write the Security Rules to make those tests pass.

To start, your database is locked down: reads and writes to the database are universally denied, and all the tests fail. As you write Security Rules, the tests will pass. To see the tests, open `functions/test.js` in your editor.

On the command line, stop the emulators (CMD + C), and restart them using `emulators:exec` and running the tests:

```console
$ firebase emulators:exec --project=codelab --import=.seed "cd functions; npm test"
```

Scroll to the top of the output:

```console
$ firebase emulators:exec --project=codelab --import=.seed "pushd functions; npm test"
i  emulators: Starting emulators: functions, firestore, hosting
⚠  functions: The following emulators are not running, calls to these services from the Functions emulator will affect production: auth, database, pubsub
⚠  Your requested "node" version "^13.7.0" doesn't match your global version "13"
⚠  functions: Unable to fetch project Admin SDK configuration, Admin SDK behavior in Cloud Functions emulator may be incorrect.
i  firestore: Importing data from /Users/user/src/firebase/rules-codelab/initial-state/.seed/firestore_export/firestore_export.overall_export_metadata
i  firestore: Firestore Emulator logging to firestore-debug.log
⚠  hosting: Authentication error when trying to fetch your current web app configuration, have you run firebase login?
⚠  hosting: Could not fetch web app configuration and there is no cached configuration on this machine. Check your internet connection and make sure you are authenticated. To continue, you must call firebase.initializeApp({...}) in your code before using Firebase.
i  hosting: Serving hosting files from: public
✔  hosting: Local server: http://localhost:5000
i  functions: Watching "/Users/user/src/firebase/rules-codelab/initial-state/functions" for Cloud Functions...
✔  functions[publishPost]: http function initialized (http://localhost:5001/codelab/us-central1/publishPost).
✔  functions[softDelete]: http function initialized (http://localhost:5001/codelab/us-central1/softDelete).
i  Running script: pushd functions; npm test
~/src/firebase/rules-codelab/initial-state/functions ~/src/firebase/rules-codelab/initial-state

> functions@ test /Users/user/src/firebase/rules-codelab/initial-state/functions
> mocha

(node:76619) ExperimentalWarning: Conditional exports is an experimental feature. This feature could change at any time


  Draft blog posts
    1) can be created with required fields by the author
    2) can be updated by author if immutable fields are unchanged
    3) can be read by the author and moderator

  Published blog posts
    4) can be read by everyone; created or deleted by no one
    5) can be updated by author or moderator

  Comments on published blog posts
    6) can be read by anyone with a permanent account
    7) can be created if email is verfied and not blocked
    8) can be updated by author for 1 hour after creation
    9) can be deleted by an author or moderator


  0 passing (848ms)
  9 failing

...

```

Right now there are 9 failures. As you build the rules file, you can measure progress by watching more tests pass.

## Create blog post drafts.
Duration: 05:00

Because the access for draft blog posts is so different from the access for published blog posts, this blogging app stores draft blog posts in a separate collection, `/drafts`. Drafts can only be accessed by the author or a moderator, and has validations for required and immutable fields.

Opening the `firestore.rules` file, you'll find a default rules file:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

The match statement, `match /{document=**}`, is using the `**` syntax to recursively apply to all documents in subcollections. And because it's at the top level, right now the same blanket rule applies to all requests, no matter who is making the request or what data they're trying to read or write.

Start by removing the inner-most match statement and replacing it with `match /drafts/{draftID}`. (Comments of the structure of documents can be helpful in rules, and will be included in this codelab; they're always optional.)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required
    }
  }
}
```

The first rule you'll write for drafts will control who can create the documents. In this application, drafts can only be created by the person listed as the author. Check that the UID of the person making the request is the same UID listed in the document.

> aside positive
>
> In rules, there are two important objects that you'll use again and again. The
> first is the `request` object, and it has two important components: the `request.
> auth` object for the user who wants access, and the `request.resource` object
> they'd like access to. In case of attempts to write, `request.resource` is the
> object that they'd like to write. The other main object is `resource`, the
> document as it's already written in Firestore. In the case of creates, nothing
> has been written yet, so `resource` is null.

The first condition for the create will be:
```
request.auth.uid == request.resource.data.authorUID
```

Next, documents can only be created if they include the three required fields, `authorUID`,`createdAt`, and `title`. (The user doesn't supply the `createdAt` field; this is enforcing that the app must add it before trying to create a document.) Since you only need to check that the attributes are being created, you can check that `request.resource` has all those keys:
```
request.resource.data.keys().hasAll([
  "authorUID",
  "createdAt",
  "title"
])
```

The final requirement for creating a blog post is that the title can't be more than 50 characters long:
```
request.resource.data.title.size < 50

```

Since all these conditions must be true, concatenate these together with logical AND operator, `&&`. The first rule becomes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;
    }
  }
}
```

In the terminal, rerun the tests and confirm that the first test passes.

## Update blog post drafts.
Duration: 05:00

Next, as authors refine their draft blog posts, they'll edit the draft documents. Create a rule for the conditions when a post can be updated. First, only the author can update their drafts. Note that here you check the UID that's already written,`resource.data.authorUID`:
```
resource.data.authorUID == request.auth.uid
```
The second requirement for an update is that two attributes, `authorUID` and `createdAt` should not change:
```
request.resource.data.diff(resource.data).unchangedKeys().hasAll([
    "authorUID",
    "createdAt"
]);
```
And finally, the title to be 50 characters or longer:
```
request.resource.data.title.size < 50;
```

Since these conditions all need to be met, concatenate them together with `&&`:

```
allow update: if
  // User is the author, and
  resource.data.authorUID == request.auth.uid &&
  // `authorUID` and `createdAt` are unchanged
  request.resource.data.diff(resource.data).unchangedKeys().hasAll([
    "authorUID",
    "createdAt"
  ]) &&
  // Title must be < 50 characters long
  request.resource.data.title.size < 50;
```

The complete rules become:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;

      allow update: if
        // User is the author, and
        resource.data.authorUID == request.auth.uid &&
        // `authorUID` and `createdAt` are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "createdAt"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;
    }
  }
}
```

Rerun your tests and confirm that another test passes.

## Delete and read drafts: Attribute Based Access Control
Duration: 05:00

Just as authors can create and update drafts, they can also delete drafts.
```
resource.data.authorUID = request.auth.uid
```

Additionally, authors with an `isModerator` attribute on their auth token are allowed to delete drafts:
```
request.auth.token.isModerator == true
```

> aside positive
> Granting privledges based on an user attribute is known as Attribute Based Access Control, or ABAC.

Since either of these conditions are sufficient for a delete, concatenate them with a logical OR operator, `||`:

```
allow delete: if resource.data.authorUID = request.auth.uid || request.auth.token.isModerator == true
```

The same conditions apply to reads, so that permission can be added to the rule:

```
allow read, delete: if resource.data.authorUID = request.auth.uid || request.auth.token.isModerator == true
```

> aside positive
> Granular permissions like `create`, `update`, and `delete` can be used in place of
>`write`. The two more granular permissions for `read` are `get` for fetching an individual document and `list` for fetching the document with other documents.

The full rules are now:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;

      allow update: if
        // User is the author, and
        resource.data.authorUID == request.auth.uid &&
        // `authorUID` and `createdAt` are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "createdAt"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;

      allow read, delete: if
        // User is draft author
        resource.data.authorUID = request.auth.uid ||
        // User is a moderator
        request.auth.token.isModerator == true;
    }
  }
}
```

Rerun your tests and confirm that another test now passes.

## Reads, creates, and deletes for published posts: denormalizing for different access patterns
Duration: 05:00

Because access patterns for the published posts and draft posts are so different, this app denormalizes the posts into separate `draft` and `published` collections. For instance, published posts can be read by anyone but can't be hard hard-deleted, while drafts can be deleted but can only be read by the author and moderators. In this app, when a user wants to publish a draft blog post, a function is triggered that will create the new published post. 

Next, you'll write the rules for published posts. The simplest rules to write are that published posts can be read by anyone, and can't be created or deleted by anyone. Add these rules:

```
match /published/{postID} {
  // `authorUID`: string, required
  // `content`: string, required
  // `publishedAt`: timestamp, required
  // `title`: string, < 50 characters, required
  // `url`: string, required
  // `visible`: boolean, required

  // Can be read by everyone
  allow read: if true;

  // Published posts are created only via functions, never by users
  // No hard deletes; soft deletes update `visible` field.
  allow create, delete: if false;
}
```
Adding these to the existing rules, the entire rules file becomes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;

      allow update: if
        // User is the author, and
        resource.data.authorUID == request.auth.uid &&
        // `authorUID` and `createdAt` are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "createdAt"
        ]) &&
        // Title must be < 50 characters long
        request.resource.data.title.size < 50;

      allow read, delete: if
        // User is draft author
        resource.data.authorUID = request.auth.uid ||
        // User is a moderator
        request.auth.token.isModerator == true;
    }

    match /published/{postID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `publishedAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required
      // `visible`: boolean, required

      // Can be read by everyone
      allow read: if true;

      // Published posts are created only via functions, never by users
      // No hard deletes; soft deletes update `visible` field.
      allow create, delete: if false;
    }
  }
}
```

Rerun the tests, and confirm that another test passes.

## Updating published posts: Custom functions and local variables
Duration: 010:00

The conditions to update a a published post are:
* it can only be done by the author or moderator, and
* it must contain all the required fields.

Since you have already written conditions for being an author or a moderator, you could copy and paste the conditions, but over time that could become difficult to read and maintain. Instead, you'll create a custom function that encapsulates the logic for being either an author or moderator. Then, you'll call it from multiple conditions.

### Create a custom function

Above the match statement for drafts, create a new function called `isAuthorOrModerator` that takes as arguments a post document (this will work for either drafts or published posts) and the user's auth object:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Returns true if user is post author or a moderator
    function isAuthorOrModerator(post, auth) {

    }

    match /drafts/{postID} {
      allow create: ...
      allow update: ...
      ...
    }

    match /published/{postID} {
      allow read: ...
      allow create, delete: ...
    }
  }
}
```

### Use local variables

Inside the function, use the `let` keyword to set `isAuthor` and `isModerator` variables. All functions must end with a return statement, and ours will return a boolean indicating if either variable is true:

```
function isAuthorOrModerator(post, auth) {
  let isAuthor = auth.uid == post.authorUID;
  let isModerator = auth.token.isModerator == true;
  return isAuthor || isModerator;
}
```

### Call the function

Now you'll update the rule for drafts to call that function, being careful to pass in `resource.data` as the first argument:

```
  // Draft blog posts
  match /drafts/{draftID} {
    ...
    // Can be deleted by author or moderator
    allow read, delete: if isAuthorOrModerator(resource.data, request.auth);
  }
```

Now you can write a condition for updating published posts that also uses the new function:
```
allow update: if isAuthorOrModerator(resource.data, request.auth);
```

### Add validations

Some of the fields of a published post shouldn't be changed, specifically `url`, `authorUID`, and `publishedAt` fields are immutable. The other two fields, `title` and `content`, and `visible` must still be present after an update. Add conditions to enforce these requirements for updates to published posts:
```
// Immutable fields are unchanged
request.resource.data.diff(resource.data).unchangedKeys().hasAll([
  "authorUID",
  "publishedAt",
  "url"
]) &&
// Required fields are present
request.resource.data.keys().hasAll([
  "content",
  "title",
  "visible"
])
```

### Create a custom function on your own

And finally, add a condition that the title be under 50 characters. Because this is reused logic, you could do this by creating a new function, `titleIsUnder50Chars`. With the new function, the condition for updating a published post becomes:
```
allow update: if
  isAuthorOrModerator(resource.data, request.auth) &&
  // Immutable fields are unchanged
  request.resource.data.diff(resource.data).unchangedKeys().hasAll([
    "authorUID",
    "publishedAt",
    "url"
  ]) &&
  // Required fields are present
  request.resource.data.keys().hasAll([
    "content",
    "title",
    "visible"
  ]) &&
  titleIsUnder50Chars(request.resource.data);
```

And the complete rule file is:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Returns true if user is post author or a moderator
    function isAuthorOrModerator(post, auth) {
      let isAuthor = auth.uid == post.authorUID;
      let isModerator = auth.token.isModerator == true;
      return isAuthor || isModerator;
    }

    function titleIsUnder50Chars(post) {
      return post.title.size < 50;
    }

    // Draft blog posts
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        titleIsUnder50Chars(request.resource.data);

      allow update: if
        // User is the author, and
        resource.data.authorUID == request.auth.uid &&
        // `authorUID` and `createdAt` are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "createdAt"
          ]) &&
        titleIsUnder50Chars(request.resource.data);

      // Can be read or deleted by author or moderator
      allow read, delete: if isAuthorOrModerator(resource.data, request.auth);
    }

    // Published blog posts are denormalized from drafts
    match /published/{postID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `publishedAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required
      // `visible`: boolean, required

      // Can be read by everyone
      allow read: if true;

      // Published posts are created only via functions, never by users
      // No hard deletes; soft deletes update `visible` field.
      allow create, delete: if false;

      allow update: if
        isAuthorOrModerator(resource.data, request.auth) &&
        // Immutable fields are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "publishedAt",
          "url"
        ]) &&
        // Required fields are present
        request.resource.data.keys().hasAll([
          "content",
          "title",
          "visible"
        ]) &&
        titleIsUnder50Chars(request.resource.data);
    }
  }
}
```

## Comments: Subcollections and sign-in provider permissions
Duration: 010:00

The published posts allow comments, and the comments are stored in a subcollection of the published post (`/published/{postID}/comments/{commentID}`). By default the rules of a collection don't apply to subcollections. You don't want the same rules that apply to the parent document of the published post to apply to the comments; you'll craft different ones.

> aside positive
> Because subcollections don't, by default, inherit the rules of the parent documents, subcollections are a good option to separate parts of a document that requires different access. If you do want a all subcollections to inherit the rules of the parent document, use the glob syntax in the match statement of the parent, i.e, `match /published/{postId=**}`.

To write rules for accessing the comments, start with the match statement:

```
match /published/{postID}/comments/{commentID} {
  // `authorUID`: string, required
  // `comment`: string, < 500 characters, required
  // `createdAt`: timestamp, required
  // `editedAt`: timestamp, optional

```

### Reading comments: Can't be anonymous

For this app, only users that have created a permanent account, not an anonymous account can read the comments. To enforce that rule, look up the `sign_in_provider` attribute that's on each `auth.token` object:

```
allow read: if !(request.auth.token.firebase.sign_in_provider == "anonymous");
```

Rerun your tests, and confirm that one more test passes.

### Creating comments: Checking a deny list

There are three conditions for creating a comment:
* a user must have a verified email
* the comment must be fewer than 500 characters, and
* they can't be on a list of banned users, which is stored in firestore in the `blocklist` collection. Taking these conditions one at a time:

```
request.auth.token.email_verified == true
```
```
request.resource.data.comment.size() < 500
```
```
exists(/databases/$(database)/documents/blocklist/$(request.auth.uid)) ? false : true;
```

> aside negative
> There's a bug in checking for non-existence of a document, i.e. `!exists(<path>)`. An easy workaround is to use the ternary operator, reversing the true and false conditions to make it negative, i.e. `exists(<path>) ? false : true`

The final rule for creating comments is:

```
allow create: if
  // User has verified email
  (request.auth.token.email_verified == true) &&
  // UID is not on denylist
  !(exists(/databases/$(database)/documents/denylist/$(request.auth.uid));
```

The rules for comments are now:
```
match /published/{postID}/comments/{commentID} {
  // `authorUID`: string, required
  // `createdAt`: timestamp, required
  // `editedAt`: timestamp, optional
  // `comment`: string, < 500 characters, required

  // Must have permanent account to read comments
  allow read: if !(request.auth.token.firebase.sign_in_provider == "anonymous");

  allow create: if
    // User has verified email
    request.auth.token.email_verified == true &&
    // Comment is under 500 charachters
    request.resource.data.comment.size() < 500 &&
    // UID is not on the block list
    // Use ternary operator to coerce result of `!exists(<path>)` to boolean
    exists(/databases/$(database)/documents/blocklist/$(request.auth.uid)) ? false : true;
```

Rerun the tests, and make sure one more test passes.

## Updating comments: Time-based rules
Duration: 05:00

The business logic for a comment is that it can be edited by the comment author for a hour after creation. To implement this, use the `createdAt` timestamp.

First, to establish that the user is the author:

```
request.auth.uid == resource.data.authorUID
```

Next, that the comment was created within the last hour:

```
resource.data.createdAt > (request.time.toMillis() - 3600000)
```

Combining these with the logical AND operator, the rule for updating comments becomes:

```
allow update: if
  // is author
  request.auth.uid == resource.data.authorUID &&
  // within an hour (3,600,000 millis) of comment creation
  resource.data.createdAt > (request.time.toMillis() - 3600000);
```

Rerun the tests, and make sure one more test passes.

## Deleting comments: checking for parent ownership
Duration: 05:00

Comments can be deleted by the comment author, a moderator, or the author of the blog post. First, check if the user is the comment author:

```
request.auth.uid == resource.data.authorUID
```

Next, check if the user is a moderator:

```
request.auth.token.isModerator == true
```

Finally, check if the user is the blog post author, using a `get` to look it up the post in Firestore:

```
request.auth.uid == get(/databases/$(database)/documents/published/$(postID))
```

Because any of these conditions are sufficient, use a logical OR operator between them:

```
allow delete: if
  // is comment author
  request.auth.uid == resource.data.authorUID ||
  // is moderator
  request.auth.token.isModerator == true ||
  // is blog post author
  request.auth.uid == get(/databases/$(database)/documents/published/$(postID));
```

Rerun the tests, and make sure one more test passes.

And the entire rules file is:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Returns true if user is post author or a moderator
    function isAuthorOrModerator(post, auth) {
      let isAuthor = auth.uid == post.authorUID;
      let isModerator = auth.token.isModerator == true;
      return isAuthor || isModerator;
    }

    function titleIsUnder50Chars(post) {
      return post.title.size < 50;
    }

    // Draft blog posts
    match /drafts/{draftID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `createdAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required

      allow create: if
        // User creating document is draft author
        request.auth.uid == request.resource.data.authorUID &&
        // Must include title, author, and url fields
        request.resource.data.keys().hasAll([
          "authorUID",
          "createdAt",
          "title"
        ]) &&
        titleIsUnder50Chars(request.resource.data);

      allow update: if
        // User is the author, and
        resource.data.authorUID == request.auth.uid &&
        // `authorUID` and `createdAt` are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "createdAt"
          ]) &&
        titleIsUnder50Chars(request.resource.data);

      // Can be read or deleted by author or moderator
      allow read, delete: if isAuthorOrModerator(resource.data, request.auth);
    }

    // Published blog posts are denormalized from drafts
    match /published/{postID} {
      // `authorUID`: string, required
      // `content`: string, required
      // `publishedAt`: timestamp, required
      // `title`: string, < 50 characters, required
      // `url`: string, required
      // `visible`: boolean, required

      // Can be read by everyone
      allow read: if true;

      // Published posts are created only via functions, never by users
      // No hard deletes; soft deletes update `visible` field.
      allow create, delete: if false;

      allow update: if
        isAuthorOrModerator(resource.data, request.auth) &&
        // Immutable fields are unchanged
        request.resource.data.diff(resource.data).unchangedKeys().hasAll([
          "authorUID",
          "publishedAt",
          "url"
        ]) &&
        // Required fields are present
        request.resource.data.keys().hasAll([
          "content",
          "title",
          "visible"
        ]) &&
        titleIsUnder50Chars(request.resource.data);
    }

    match /published/{postID}/comments/{commentID} {
      // `authorUID`: string, required
      // `createdAt`: timestamp, required
      // `editedAt`: timestamp, optional
      // `comment`: string, < 500 characters, required

      // Must have permanent account to read comments
      allow read: if !(request.auth.token.firebase.sign_in_provider == "anonymous");

      allow create: if
        // User has verified email
        request.auth.token.email_verified == true &&
        // Comment is under 500 charachters
        request.resource.data.comment.size() < 500 &&
        // UID is not on the block list
        // Use ternary operator to coerce result of `!exists(<path>)` to boolean
        exists(/databases/$(database)/documents/blocklist/$(request.auth.uid)) ? false : true;

      allow update: if
        // is author
        request.auth.uid == resource.data.authorUID &&
        // within an hour (3,600,000 millis) of comment creation
        resource.data.createdAt > (request.time.toMillis() - 3600000);

      allow delete: if
        // is comment author
        request.auth.uid == resource.data.authorUID ||
        // is moderator
        request.auth.token.isModerator == true ||
        // is blog post author
        request.auth.uid == get(/databases/$(database)/documents/published/$(postID));
    }
  }
}
```
