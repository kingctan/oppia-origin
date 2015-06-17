// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview End-to-end tests of the interaction between the player and
 * editor.
 *
 * @author Jacob Davis (jacobdavis11@gmail.com)
 */

var general = require('../protractor_utils/general.js');
var forms = require('../protractor_utils/forms.js');
var users = require('../protractor_utils/users.js');
var workflow = require('../protractor_utils/workflow.js');
var editor = require('../protractor_utils/editor.js');
var player = require('../protractor_utils/player.js');
var interactions = require('../../../extensions/interactions/protractor.js');

describe('State editor', function() {
  it('should display plain text content', function() {
    users.createUser('user1@example.com', 'user1');
    users.login('user1@example.com');

    workflow.createExploration('sums', 'maths');
    editor.setContent(forms.toRichText('plain text'));
    editor.setInteraction('Continue', 'click here');
    editor.addRule('Continue', null, 'final state', true, 'Default');

    // Setup a terminating state
    editor.moveToState('final state');
    editor.setInteraction('EndExploration');
    editor.saveChanges();

    general.moveToPlayer();
    player.expectContentToMatch(forms.toRichText('plain text'));
    player.expectExplorationToNotBeOver();
    player.expectInteractionToMatch('Continue', 'click here');
    player.submitAnswer('Continue', null);
    player.expectExplorationToBeOver();

    users.logout();
  });

  it('should walk through the tutorial when user repeteadly clicks Next', function() {
    var NUM_TUTORIAL_STAGES = 5;
    users.createUser('user@example.com', 'user');
    users.login('user@example.com');

    workflow.createExplorationAndStartTutorial('sums', 'maths');
    for (var i = 0; i < NUM_TUTORIAL_STAGES - 1; i++) {
      editor.progressInTutorial();
    }
    editor.finishTutorial();
    users.logout();
  });

  it('should create content and multiple choice interactions', function() {
    users.createUser('user2@example.com', 'user2');
    users.login('user2@example.com');

    workflow.createExploration('sums', 'maths');
    editor.setContent(function(richTextEditor) {
      richTextEditor.appendBoldText('bold text');
      richTextEditor.appendPlainText(' ');
      richTextEditor.appendItalicText('italic text');
      richTextEditor.appendPlainText(' ');
      richTextEditor.appendUnderlineText('underline text');
      richTextEditor.appendPlainText(' ');
      richTextEditor.appendOrderedList(['entry 1', 'entry 2']);
      richTextEditor.appendUnorderedList(['an entry', 'another entry']);
    });
    editor.setInteraction(
      'MultipleChoiceInput',
      [forms.toRichText('option A'), forms.toRichText('option B')]);
    editor.addRule('MultipleChoiceInput', null, 'final state', true, 'Default');

    // Setup a terminating state
    editor.moveToState('final state');
    editor.setInteraction('EndExploration');
    editor.saveChanges();

    general.moveToPlayer();
    player.expectExplorationToNotBeOver();
    player.expectInteractionToMatch(
      'MultipleChoiceInput',
      [forms.toRichText('option A'), forms.toRichText('option B')]);
    player.submitAnswer('MultipleChoiceInput', 'option B');
    player.expectExplorationToBeOver();

    users.logout();
  });

  it('should obey numeric interaction rules and display feedback', function() {
    users.createUser('user3@example.com', 'user3');
    users.login('user3@example.com');

    workflow.createExploration('sums', 'maths');
    editor.setContent(forms.toRichText('some content'));
    editor.setInteraction('NumericInput');
    editor.addRule('NumericInput', function(richTextEditor) {
      richTextEditor.appendBoldText('correct');
    }, 'final state', true, 'IsInclusivelyBetween', -1, 3);
    editor.addRule('NumericInput',
      forms.toRichText('out of bounds'), null, false, 'Default');

    // Setup a terminating state
    editor.moveToState('final state');
    editor.setInteraction('EndExploration');
    editor.saveChanges();

    general.moveToPlayer();
    player.submitAnswer('NumericInput', 5);
    player.expectLatestFeedbackToMatch(forms.toRichText('out of bounds'));
    player.expectExplorationToNotBeOver();
    // It's important to test the value 0 in order to ensure that it would
    // still get submitted even though it is a falsy value in JavaScript.
    player.submitAnswer('NumericInput', 0);
    player.expectLatestFeedbackToMatch(function(richTextChecker) {
      richTextChecker.readBoldText('correct');
    });
    player.expectExplorationToBeOver();

    users.logout();
  });
});

describe('Full exploration editor', function() {
  it('should navigate multiple states correctly, with parameters', function() {
    users.createUser('user4@example.com', 'user4');
    users.login('user4@example.com');

    workflow.createExploration('sums', 'maths');
    editor.setStateName('state 1');
    editor.setContent(forms.toRichText('this is state 1'));
    editor.setInteraction('NumericInput');
    editor.addRule('NumericInput', null, 'final state', true, 'Equals', 21);
    editor.RuleEditor(0).createNewStateAndSetDestination('state 2');

    editor.moveToState('state 2');
    editor.setContent(forms.toRichText(
      'this is state 2 with previous answer {{answer}}'));
    editor.setInteraction(
      'MultipleChoiceInput',
      [forms.toRichText('return'), forms.toRichText('complete')]);
    editor.addRule('MultipleChoiceInput', null, 'state 1', false,
      'Equals', 'return');
    editor.addRule('MultipleChoiceInput', null, 'final state',
      false, 'Default');

    // Setup a terminating state
    editor.moveToState('final state');
    editor.setInteraction('EndExploration');
    editor.saveChanges();

    general.moveToPlayer();
    player.expectContentToMatch(forms.toRichText('this is state 1'));
    player.submitAnswer('NumericInput', 19);
    player.submitAnswer('NumericInput', 21);
    player.expectContentToMatch(forms.toRichText(
      'this is state 2 with previous answer 21'));
    player.submitAnswer('MultipleChoiceInput', 'return');
    player.expectContentToMatch(forms.toRichText('this is state 1'));
    player.submitAnswer('NumericInput', 21);
    player.expectContentToMatch(forms.toRichText(
      'this is state 2 with previous answer 21'));
    player.expectExplorationToNotBeOver();
    player.submitAnswer('MultipleChoiceInput', 'complete');
    player.expectExplorationToBeOver();
    users.logout();
  });

  it('should handle discarding changes, navigation, deleting states, ' +
      'changing the first state, displaying content, deleting rules and ' +
      'switching to preview mode', function() {
    users.createUser('user5@example.com', 'user5');
    users.login('user5@example.com');

    workflow.createExploration('sums', 'maths');
    general.getExplorationIdFromEditor().then(function(explorationId) {

      // Check discarding of changes
      editor.setStateName('state1');
      editor.expectStateNamesToBe(['state1']);
      editor.setContent(forms.toRichText('state1 content'));
      editor.setInteraction('TextInput');
      editor.addRule('TextInput', null, 'final state', true, 'Default');
      editor.RuleEditor('default').createNewStateAndSetDestination('state2');
      editor.moveToState('state2');
      // NOTE: we must move to the state before checking state names to avoid
      // inexplicable failures of the protractor utility that reads state names
      // (the user-visible names are fine either way). See issue 732 for more.
      editor.expectStateNamesToBe(['final state', 'state1', 'state2']);
      editor.setInteraction('EndExploration');

      editor.discardChanges();
      editor.expectCurrentStateToBe(general.FIRST_STATE_DEFAULT_NAME);
      editor.setStateName('first');
      editor.expectStateNamesToBe(['first']);

      // Check deletion of states and changing the first state
      editor.setInteraction('TextInput');
      editor.addRule('TextInput', null, 'final state', true, 'Default');
      editor.RuleEditor('default').createNewStateAndSetDestination('second');
      editor.moveToState('second');
      editor.expectStateNamesToBe(['final state', 'first', 'second']);
      editor.expectCurrentStateToBe('second');
      editor.expectAvailableFirstStatesToBe(['final state', 'first', 'second']);
      editor.setFirstState('second');
      editor.moveToState('first');
      editor.deleteState('first');
      editor.expectCurrentStateToBe('second');
      editor.expectStateNamesToBe(['final state', 'second']);

      // Check behaviour of the back button
      editor.setObjective('do stuff');
      expect(browser.getCurrentUrl()).toEqual(
        general.SERVER_URL_PREFIX + general.EDITOR_URL_SLICE + explorationId +
        '#/gui/second');
      browser.navigate().back();
      expect(browser.getCurrentUrl()).toEqual(
        general.SERVER_URL_PREFIX + general.EDITOR_URL_SLICE + explorationId +
        '#/settings');
      browser.navigate().back();
      expect(browser.getCurrentUrl()).toEqual(
        general.SERVER_URL_PREFIX + general.EDITOR_URL_SLICE + explorationId +
        '#/gui/second');

      // Check display of content & interaction in the editor
      editor.setContent(function(richTextEditor) {
        richTextEditor.appendItalicText('Welcome');
      });
      editor.expectContentToMatch(function(richTextChecker) {
        richTextChecker.readItalicText('Welcome');
      });
      editor.setInteraction('NumericInput');
      editor.expectInteractionToMatch('NumericInput');

      // Check deletion of rules
      editor.addRule('NumericInput', forms.toRichText('Farewell'), null,
        false, 'Default');
      editor.RuleEditor('default').
        expectAvailableDestinationsToBe(['second', 'final state']);
      editor.RuleEditor('default').setDestination('final state');
      editor.RuleEditor('default').
        expectAvailableDestinationsToBe(['second', 'final state']);
      editor.addRule('NumericInput', null, 'final state', false,
        'IsGreaterThan', 2);
      editor.RuleEditor(0).delete();

      // Setup a terminating state
      editor.moveToState('final state');
      editor.setInteraction('EndExploration');

      // Check editor preview tab
      editor.navigateToPreviewTab();
      player.expectContentToMatch(function(richTextEditor) {
        richTextEditor.readItalicText('Welcome');
      });
      player.expectInteractionToMatch('NumericInput');
      player.submitAnswer('NumericInput', 6);
      // This checks the previously-deleted rule no longer applies.
      player.expectLatestFeedbackToMatch(forms.toRichText('Farewell'));
      player.expectExplorationToBeOver();

      editor.discardChanges();
      users.logout();
    });
  });

  afterEach(function() {
    general.checkForConsoleErrors([]);
  });
});

describe('rich-text components', function() {
  it('should display correctly', function() {
    users.createUser('user11@example.com', 'user11');
    users.login('user11@example.com')

    workflow.createExploration('RTE components', 'maths');

    editor.setContent(function(richTextEditor) {
      richTextEditor.appendBoldText('bold');
      richTextEditor.appendPlainText(' ');
      richTextEditor.addRteComponent(
        'Collapsible', 'title', forms.toRichText('inner'));
      // TODO (Jacob) add test for image RTE component
      richTextEditor.addRteComponent('Link', 'http://google.com/', true);
      richTextEditor.addRteComponent('Math', 'abc');
      richTextEditor.addRteComponent('Tabs', [{
        title: 'title 1',
        content: forms.toRichText('contents 1')
      }, {
        title: 'title 1',
        content: forms.toRichText('contents 2')
      }]);
      richTextEditor.addRteComponent('Video', 'ANeHmk22a6Q', 10, 100, false);
    })
    editor.setInteraction('TextInput');
    editor.saveChanges();

    general.moveToPlayer();
    player.expectContentToMatch(function(richTextChecker) {
      richTextChecker.readBoldText('bold');
      richTextChecker.readPlainText(' ');
      richTextChecker.readRteComponent(
        'Collapsible', 'title', forms.toRichText('inner'));
      richTextChecker.readRteComponent('Link', 'http://google.com/', true);
      richTextChecker.readRteComponent('Math', 'abc');
      richTextChecker.readRteComponent('Tabs', [{
        title: 'title 1',
        content: forms.toRichText('contents 1')
      }, {
        title: 'title 1',
        content: forms.toRichText('contents 2')
      }]);
      richTextChecker.readRteComponent('Video', 'ANeHmk22a6Q', 10, 100, false);
    });


    users.logout();
  });

  it('should allow nesting of RTE components inside one another', function() {
    users.createUser('user12@example.com', 'user12');
    users.login('user12@example.com')

    workflow.createExploration('RTE components', 'maths');

    editor.setContent(function(richTextEditor) {
      richTextEditor.appendItalicText('slanted');
      richTextEditor.appendPlainText(' ');
      richTextEditor.addRteComponent(
          'Collapsible', 'heading', function(collapsibleEditor) {
        collapsibleEditor.appendBoldText('boldtext');
        collapsibleEditor.appendPlainText(' ');
        collapsibleEditor.addRteComponent('Math', 'xyz');
      });
    });

    editor.setInteraction('EndExploration');
    editor.saveChanges();

    general.moveToPlayer();
    player.expectContentToMatch(function(richTextChecker) {
      richTextChecker.readItalicText('slanted');
      richTextChecker.readPlainText(' ');
      richTextChecker.readRteComponent(
          'Collapsible', 'heading', function(collapsibleChecker) {
        collapsibleChecker.readBoldText('boldtext');
        collapsibleChecker.readPlainText(' ');
        collapsibleChecker.readRteComponent('Math', 'xyz');
      });
    });

    users.logout();
  });

  afterEach(function() {
    general.checkForConsoleErrors([
      // TODO (Jacob) Remove when
      // https://code.google.com/p/google-cast-sdk/issues/detail?id=309 is fixed
      'chrome-extension://boadgeojelhgndaghljhdicfkmllpafd/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED',
      'chrome-extension://dliochdbjfkdbacpmhlcpmleaejidimm/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED',
      'chrome-extension://hfaagokkkhdbgiakmmlclaapfelnkoah/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED',
      'chrome-extension://fmfcbgogabcbclcofgocippekhfcmgfj/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED',
      'chrome-extension://enhhojjnijigcajfphajepfemndkmdlo/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED',
      'chrome-extension://eojlgccfgnjlphjnlopmadngcgmmdgpk/' +
        'cast_sender.js 0:0 Failed to load resource: net::ERR_FAILED'
    ]);
  });
});

describe('Interactions', function() {
  it('should pass their own test suites', function() {
    users.createUser('interactions@example.com', 'interactions');
    users.login('interactions@example.com');
    workflow.createExploration('interactions', 'interactions');
    editor.setStateName('first');
    editor.setContent(forms.toRichText('some content'));

    var defaultRuleSet = false;

    for (var interactionId in interactions.INTERACTIONS) {
      var interaction = interactions.INTERACTIONS[interactionId];
      for (var i = 0; i < interaction.testSuite.length; i++) {
        var test = interaction.testSuite[i];

        editor.setInteraction.apply(
          null, [interactionId].concat(test.interactionArguments));

        editor.addRule.apply(null, [
          interactionId, forms.toRichText('yes'), 'first', false
        ].concat(test.ruleArguments));

        if (!defaultRuleSet) {
          // The default rule will be preserved for subsequent tests.
          editor.addRule(
            interactionId, forms.toRichText('no'), null, false, 'Default');
          defaultRuleSet = true;
        }

        editor.navigateToPreviewTab();
        player.expectInteractionToMatch.apply(
          null, [interactionId].concat(test.expectedInteractionDetails));
        for (var j = 0; j < test.wrongAnswers.length; j++) {
          player.submitAnswer(interactionId, test.wrongAnswers[j]);
          player.expectLatestFeedbackToMatch(forms.toRichText('no'));
        }
        for (var j = 0; j < test.correctAnswers.length; j++) {
          player.submitAnswer(interactionId, test.correctAnswers[j]);
          player.expectLatestFeedbackToMatch(forms.toRichText('yes'));
        }
        editor.navigateToMainTab();
      }
    }

    editor.discardChanges();
    users.logout();
  });

  afterEach(function() {
    general.checkForConsoleErrors([]);
  });
});

describe('Exploration history', function() {
  it('should display the history', function() {
    users.createUser('history@example.com', 'explorationhistory');
    users.login('history@example.com');
    workflow.createExploration('history', 'history');

    // Constants for colors of nodes in history graph
    var COLOR_ADDED = 'rgb(78, 162, 78)';
    var COLOR_DELETED = 'rgb(220, 20, 60)';
    var COLOR_CHANGED = 'rgb(30, 144, 255)';
    var COLOR_UNCHANGED = 'rgb(245, 245, 220)';
    var COLOR_RENAMED_UNCHANGED = 'rgb(255, 215, 0)';

    // Compare a version to itself (just contains first node)
    editor.expectGraphComparisonOf(1, 1).toBe([
      {'label': 'First State', 'color': COLOR_UNCHANGED}
    ], [0, 0, 0]);

    // Check renaming state, editing text, editing interactions and adding state
    editor.moveToState('First State');
    editor.setStateName('first');
    editor.setContent(forms.toRichText('enter 6 to continue'));
    editor.setInteraction('NumericInput');
    editor.addRule('NumericInput', null, 'second', true, 'Equals', 6);
    editor.moveToState('second');
    editor.setContent(forms.toRichText('this is state 2'));
    editor.setInteraction('Continue');
    editor.addRule('Continue', null, 'final state', true, 'Default');

    // Setup a terminating state
    editor.moveToState('final state');
    editor.setInteraction('EndExploration');
    editor.moveToState('first');
    editor.saveChanges();

    var VERSION_1_STATE_1_CONTENTS = {
      1: {text: 'content:', highlighted: false},
      2: {text: '- type: text', highlighted: false},
      3: {text: '  value: <p>enter 6 to continue</p>', highlighted: true},
      4: {text: 'interaction:', highlighted: false},
      5: {text: '  answer_groups:', highlighted: true},
      6: {text: '  - outcome:', highlighted: true},
      7: {text: '      dest: second', highlighted: true},
      8: {text: '      feedback: []', highlighted: true},
      9: {text: '      param_changes: []', highlighted: true},
      10: {text: '    rule_specs:', highlighted: true},
      11: {text: '    - inputs:', highlighted: true},
      12: {text: '        x: 6.0', highlighted: true},
      13: {text: '      name: Equals', highlighted: true},
      14: {text: '  customization_args: {}', highlighted: false},
      15: {text: '  default_outcome:', highlighted: true},
      16: {text: '    dest: first', highlighted: true},
      17: {text: '    feedback: []', highlighted: false},
      18: {text: '    param_changes: []', highlighted: false},
      19: {text: '  id: NumericInput', highlighted: true},
      20: {text: '  triggers: []', highlighted: false},
      21: {text: 'param_changes: []', highlighted: false},
      22: {text: ' ', highlighted: false}
    };
    var VERSION_2_STATE_1_CONTENTS = {
      1: {text: 'content:', highlighted: false},
      2: {text: '- type: text', highlighted: false},
      3: {text: '  value: \'\'', highlighted: true},
      4: {text: 'interaction:', highlighted: false},
      5: {text: '  answer_groups: []', highlighted: true},
      6: {text: '  customization_args: {}', highlighted: false},
      7: {text: '  default_outcome:', highlighted: false},
      // Note that highlighting *underneath* a line is still considered a
      // highlight.
      8: {text: '    dest: First State', highlighted: true},
      9: {text: '    feedback: []', highlighted: false},
      10: {text: '    param_changes: []', highlighted: false},
      11: {text: '  id: null', highlighted: true},
      12: {text: '  triggers: []', highlighted: false},
      13: {text: 'param_changes: []', highlighted: false},
      14: {text: ' ', highlighted: false}
    };
    var STATE_2_STRING =
      'content:\n' +
      '- type: text\n' +
      '  value: <p>this is state 2</p>\n' +
      'interaction:\n' +
      '  answer_groups: []\n' +
      '  customization_args:\n' +
      '    buttonText:\n' +
      '      value: Continue\n' +
      '  default_outcome:\n' +
      '    dest: final state\n' +
      '    feedback: []\n' +
      '    param_changes: []\n' +
      '  id: Continue\n' +
      '  triggers: []\n' +
      'param_changes: []\n' +
      ' ';

    editor.expectGraphComparisonOf(1, 2).toBe([
      {'label': 'first (was: First ...', 'color': COLOR_CHANGED},
      {'label': 'second', 'color': COLOR_ADDED},
      {'label': 'final state', 'color': COLOR_ADDED}
    ], [2, 2, 0]);
    editor.expectTextComparisonOf(1, 2, 'first (was: First ...')
      .toBeWithHighlighting(VERSION_1_STATE_1_CONTENTS, VERSION_2_STATE_1_CONTENTS);
    editor.expectTextComparisonOf(1, 2, 'second')
      .toBe(STATE_2_STRING, ' ');

    // Switching the 2 compared versions should give the same result.
    editor.expectGraphComparisonOf(2, 1).toBe([
      {'label': 'first (was: First ...', 'color': COLOR_CHANGED},
      {'label': 'second', 'color': COLOR_ADDED},
      {'label': 'final state', 'color': COLOR_ADDED}
    ], [2, 2, 0]);

    // Check deleting a state
    editor.deleteState('second');
    editor.moveToState('first');
    editor.RuleEditor(0).setDestination('final state');
    editor.saveChanges();

    editor.expectGraphComparisonOf(2, 3).toBe([
      {'label': 'first', 'color': COLOR_CHANGED},
      {'label': 'second', 'color': COLOR_DELETED},
      {'label': 'final state', 'color': COLOR_UNCHANGED}
    ], [3, 1, 2]);
    editor.expectTextComparisonOf(2, 3, 'second')
      .toBe(' ', STATE_2_STRING);

    // Check renaming a state
    editor.moveToState('first');
    editor.setStateName('third');
    editor.saveChanges();
    editor.expectGraphComparisonOf(3, 4).toBe([
      {'label': 'third (was: first)', 'color': COLOR_RENAMED_UNCHANGED},
      {'label': 'final state', 'color': COLOR_UNCHANGED}
    ], [1, 0, 0]);

    // Check re-inserting a deleted state
    editor.moveToState('third');
    editor.RuleEditor(0).createNewStateAndSetDestination('second');
    editor.moveToState('second');
    editor.setContent(forms.toRichText('this is state 2'));
    editor.setInteraction('Continue');
    editor.addRule('Continue', null, 'final state', false, 'Default');
    editor.saveChanges();

    editor.expectGraphComparisonOf(2, 5).toBe([
      {'label': 'third (was: first)', 'color': COLOR_CHANGED},
      {'label': 'second', 'color': COLOR_UNCHANGED},
      {'label': 'final state', 'color': COLOR_UNCHANGED}
    ], [2, 0, 0]);

    // Check that reverting works
    editor.revertToVersion(2);
    general.moveToPlayer();
    player.expectContentToMatch(forms.toRichText('enter 6 to continue'));
    player.submitAnswer('NumericInput', 6);
    player.expectExplorationToNotBeOver();
    player.expectContentToMatch(forms.toRichText('this is state 2'));
    player.expectInteractionToMatch('Continue', 'CONTINUE');
    player.submitAnswer('Continue', null);
    player.expectExplorationToBeOver();

    general.moveToEditor();
    editor.expectGraphComparisonOf(4, 6).toBe([
      {'label': 'first (was: third)', 'color': COLOR_CHANGED},
      {'label': 'second', 'color': COLOR_ADDED},
      {'label': 'final state', 'color': COLOR_UNCHANGED}
    ], [3, 2, 1]);

    users.logout();
  });

  afterEach(function() {
    general.checkForConsoleErrors([]);
  });
});
