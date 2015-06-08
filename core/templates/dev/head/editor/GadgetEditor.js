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
 * @fileoverview Controller for a state's gadgets editor.
 *
 * @author vjoisar@google.com (Vishal Joisar)
 */

// TODO(vjoisar): desc for the gadget ui editor
oppia.controller('GadgetEditor', [
  '$scope', '$http', '$rootScope', '$modal', '$filter', 'editorContextService',
  'oppiaHtmlEscaper', 'explorationGadgetsService', 
  'extensionTagAssemblerService', 'GADGET_SPECS',
  function($scope, $http, $rootScope, $modal, $filter, editorContextService,
    oppiaHtmlEscaper, explorationGadgetsService,
    extensionTagAssemblerService, GADGET_SPECS) {

    $scope.$on('gadgetsChangedOrInitialized', function(evt) {
      $scope.getAllGadgetsInfo();
    });
    $scope.getAllGadgetsInfo = function(){
      $scope.gadgets = explorationGadgetsService.getGadgets();
      $scope.panels = explorationGadgetsService.getPanels();
      console.log($scope.gadgets);
    };
    $scope.openGadgetModal = function(gadgetEditData, panelName) {
      $modal.open({
        templateUrl: 'modals/addGadget',
        // Clicking outside this modal should not dismiss it.
        backdrop: 'static',
        resolve: {
          gadgetEditData: function() {
            return gadgetEditData;
          },
          panelName: function() {
            return panelName;
          }
        },
        controller: [
          '$scope', '$modalInstance', 'explorationStatesService', 
          'editorContextService', 'explorationGadgetsService', 'gadgetEditData',
          'panelName', 'GADGET_SPECS',
          function($scope, $modalInstance, explorationStatesService, 
            editorContextService, explorationGadgetsService, gadgetEditData, 
            panelName, GADGET_SPECS) {

        $scope.ALLOWED_GADGETS = GLOBALS.ALLOWED_GADGETS;
        $scope.GADGET_SPECS = GADGET_SPECS;

        var _loadSchemaForm = function(gadgetId) {
          var gadgetSpec = GADGET_SPECS[gadgetId];
          $scope.customizationArgSpecs = gadgetSpec.customization_arg_specs;
          for (var i = 0; i < $scope.customizationArgSpecs.length; i++) {
              var argName = $scope.customizationArgSpecs[i].name;
            $scope.gadgetData.customizationArgs[argName] = {
              value: ($scope.gadgetData.customizationArgs.hasOwnProperty(argName)?
                angular.copy($scope.gadgetData.customizationArgs[argName].value):
                angular.copy($scope.customizationArgSpecs[i].default_value)
              )
            };
          }
          $scope.$broadcast('schemaBasedFormsShown');
          $scope.form = {};
        }
        $scope.editingGadget = false;
        //Initialising gadgetDict
        $scope.gadgetData = {
          gadgetId: '',
          gadgetName: '',
          position: 'left',
          customizationArgs: {},
          visibleInStates: []
        };
        if(gadgetEditData){
          if(!panelName) {
            console.error('panelName required to make the changes.')
            return;
          }
          $scope.editingGadget = true;
          $scope.gadgetData = {
            gadgetId: gadgetEditData.gadget_id,
            gadgetName: gadgetEditData.gadget_name,
            position: panelName,
            customizationArgs: gadgetEditData.customization_args,
            visibleInStates: gadgetEditData.visible_in_states
          };
          _loadSchemaForm(gadgetEditData.gadget_id);
        }

        $scope.explorationStates = 
          Object.keys(explorationStatesService.getStates());

        $scope.onChangeGadgetId = function(newGadgetId) {
          $scope.gadgetData.gadgetId = newGadgetId;
          $scope.gadgetData.gadgetName = (
            explorationGadgetsService.getUniqueGadgetName(newGadgetId)
          );
          $scope.gadgetData.visibleInStates= 
              [editorContextService.getActiveStateName()];
          _loadSchemaForm(newGadgetId);
        };

        $scope.manageVisibilityInStates = function (stateName) {
          var index = $scope.gadgetData.visibleInStates.indexOf(stateName);
          // is currently selected
          if (index > -1) {
            $scope.gadgetData.visibleInStates.splice(index, 1);
          }
          // is newly selected
          else {
            $scope.gadgetData.visibleInStates.push(stateName);
          }
        };
        $scope.returnToGadgetSelector = function() {
          $scope.gadgetData = {
            gadgetId: '',
            gadgetName: '',
            position: '',
            customizationArgs: {},
            visibleInStates: []
          };
        };
        $scope.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
        $scope.addGadget = function() {
          //TODO(vjoisar):Add Validation if any field is empty to warn user 
          //  before saving or closing the dialog;
          var retrnObj = {
            mode: "addingGadget",
            data: $scope.gadgetData
          }
          $modalInstance.close(retrnObj);
        };
        $scope.updateGadget = function() {
          //TODO(vjoisar):Add Validation if any field is empty to warn user 
          //  before saving or closing the dialog;
          var retrnObj = {
            mode: "editingGadget",
            data: $scope.gadgetData
          }
          $modalInstance.close(retrnObj);
        };
        }]
      }).result.then(function(retrnObj){
        var gadgetData = retrnObj.data;
        //return
        if(retrnObj.mode == 'editingGadget') {
          $scope.editGadget(gadgetData);
        }
        else if(retrnObj.mode == 'addingGadget') {
          $scope.saveNewGadget(gadgetData);
        }
        else {
          console.warn("unhandled gadget mode...");
        }
      }, function() {
        console.log('Gadget modal closed');
      });
    };

    $scope.deleteGadget = function(gadgetName) {
      explorationGadgetsService.deleteGadget(gadgetName);
    };

    $scope.editGadget = function(newGadgetData) {
      explorationGadgetsService.updateGadget(newGadgetData);
    };

    $scope.renameGadget = function(newGadgetName) {
      //@sll:- Scoping issues for $scope.newGadgetName
      $scope.newGadgetName = newGadgetName;
      //Normalize the new gadget name...
      if(!($scope.oldGadgetName && $scope.newGadgetName)) {
        console.log("Data missing to rename gadget. OldName: " +
          $scope.oldGadgetName + " New name: " + $scope.newGadgetName);
      }
      else if($scope.oldGadgetName != $scope.newGadgetName) {
        explorationGadgetsService.renameGadget($scope.oldGadgetName, 
                                               $scope.newGadgetName);
      }
      $scope.oldGadgetName = '';
      $scope.newGadgetName = '';
    };

    $scope.initAndShowGadgetEditor = function(currentGadgetName) {
      $scope.oldGadgetName = currentGadgetName;
      $scope.newGadgetName = currentGadgetName;
    };
    $scope.saveNewGadget = function(gadgetData) {
      explorationGadgetsService.addGadget(gadgetData, gadgetData.position);
    };
}]);
