// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const firestore = admin.initializeApp().firestore();

// Publishes draft posts. Triggered via a button click by admin user.
exports.publishPost = functions.https.onRequest((req, res) => {
  // Fetch post from `drafts`
  const body = JSON.parse(req.body);
  let post = firestore.document(`drafts/${body.draftID}`);

  // Modify post's fields
  post.publishedAt = firestore.Timestamp.fromDate(new Date());
  delete post.createdAt;
  post.visible = true;

  // Create new updated post
  firestore.document(`published/${body.draftID}`).create(post)
    .then(() => res.json({status: 200}));
});

// Marks published drafts as hidden.
exports.softDelete = functions.https.onRequest((req, res) => {
  const body = JSON.parse(req.body);
  // Flip `visible` field to false;
  firestore.document(`published/${body.postID}`).update({visible: false})
    .then(() => res.json({status: 200}));
});
