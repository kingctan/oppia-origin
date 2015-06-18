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
 * Directive for the AdviceBar gadget.
 *
 * IMPORTANT NOTE: The naming convention for customization args that are passed
 * into the directive is: the name of the parameter, followed by 'With',
 * followed by the name of the arg.
 */

oppia.directive('oppiaGadgetAdviceBar', [
  'oppiaHtmlEscaper', function(oppiaHtmlEscaper) {

    // Maximum and minimum number of tips that an AdviceBar can hold.
    var _MAX_TIP_COUNT = 3;
    var _MIN_TIP_COUNT = 1;

    // Constants for calculation of height and width.
    // TODO(anuzis): Update these values to reflect actual size
    // as UX polish is finalized.
    var _WIDTH = 100;
    var _TITLE_HEIGHT = 50;
    var _HEIGHT_PER_ADVICE_RESOURCE = 100;

    return {
      restrict: 'E',
      templateUrl: 'gadget/AdviceBar',
      controller: ['$scope', '$attrs', '$modal', function ($scope, $attrs, $modal) {
        $scope.adviceBarTitle = oppiaHtmlEscaper.escapedJsonToObj($attrs.titleWithValue);
        $scope.adviceBarResources = oppiaHtmlEscaper.escapedJsonToObj($attrs.adviceObjectsWithValue);

        // Validates that AdviceBar uses an acceptable configuration.
        // @sll: How do you suggest gadget-specific validation gets surfaced
        // on the front-end? Rather than giving gadget developers the ability
        // to flag errors directly mid-validation, is it better if we ask them
        // to return a validation string that the gadgetValidator service
        // raises to content authors?
        $scope.validate = function() {
          var tip_count = $scope.adviceBarResources.length;
          if (tip_count > _MAX_TIP_COUNT) {
            var validationError = 'AdviceBars are limited to ' + _MAX_TIP_COUNT + ' tips.';
            return validationError;
          } else if (tip_count < _MIN_TIP_COUNT) {
            var validationError = 'AdviceBars require at least ' + _MIN_TIP_COUNT + ' tips.';
            return validationError;
          } else {
            return null;
          }
        }

        $scope.getHeight = function() {
          var height = 0;
          var tip_count = $scope.adviceBarResources.length;

          // If the AdviceBar has a title to display, factor it into
          // the gadget's height.
          if ($scope.adviceBarTitle != '') {
            height = height + _TITLE_HEIGHT;
          }
          height += _HEIGHT_PER_ADVICE_RESOURCE * tip_count;
          return height;
        }

        $scope.getWidth = function () {
          return _WIDTH;
        }



        $scope.overlayAdviceModal = function(adviceResourceIndex) {
          $modal.open({
            templateUrl: '../extensions/gadgets/AdviceBar/static/html/advice_overlay.html',
            controller: 'AdviceBarModalCtrl',
            backdrop: true,
            resolve: {
              adviceTitle: function() {
                return $scope.adviceBarResources[adviceResourceIndex].adviceTitle;
              },
              adviceHtml: function() {
                return $scope.adviceBarResources[adviceResourceIndex].adviceHtml;
              }
            },
          })
        };
      }],
    }
  }
]);

oppia.controller('AdviceBarModalCtrl',
  ['$scope', 'adviceTitle', 'adviceHtml',
  function ($scope, adviceTitle, adviceHtml) {
    $scope.adviceTitle = adviceTitle;
    $scope.adviceHtml = adviceHtml;
}]);
