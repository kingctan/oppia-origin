# Copyright 2012 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

__author__ = 'Sean Lip'

import unittest

from core.controllers import editor
from core.controllers import pages

import feconf
import test_utils


@unittest.skipIf(feconf.PLATFORM != 'gae',
                 'login not implemented for non-GAE platform')
class AdminIntegrationTest(test_utils.GenericTestBase):

    def test_admin_page(self):
        """Test that the admin page shows the expected sections."""
        # Login as an admin.
        self.login('editor@example.com', is_admin=True)

        response = self.testapp.get('/admin')

        self.assertEqual(response.status_int, 200)
        self.assertIn('Performance Counters', response.body)
        self.assertIn(
            'Total processing time for all JSON responses', response.body)
        self.assertIn('Configuration', response.body)
        self.assertIn('Actions', response.body)
        self.assertIn('Reload a single exploration', response.body)
        self.assertIn('counting.yaml', response.body)

        self.logout()

    def test_admin_page_rights(self):
        """Test access rights to the admin page."""

        response = self.testapp.get('/admin')
        self.assertEqual(response.status_int, 302)

        # Login as a non-admin.
        self.login('editor@example.com')
        response = self.testapp.get('/admin', expect_errors=True)
        self.assertEqual(response.status_int, 401)
        self.logout()

        # Login as an admin.
        self.login('admin@example.com', is_admin=True)
        response = self.testapp.get('/admin')
        self.assertEqual(response.status_int, 200)
        self.logout()

    def test_change_configuration_property(self):
        """Test that configuration properties can be changed."""

        # Login as an admin.
        self.login('admin@example.com', is_admin=True)

        ANNOUNCEMENT_TEXT = 'TEST ANNOUNCEMENT'

        response = self.testapp.get('/admin')
        csrf_token = self.get_csrf_token_from_response(response)

        response_dict = self.get_json('/adminhandler')
        response_config_properties = response_dict['config_properties']
        self.assertDictContainsSubset({
            'value': ''
        }, response_config_properties[editor.EDITOR_PAGE_ANNOUNCEMENT.name])

        payload = {
            'action': 'save_config_properties',
            'new_config_property_values': {
                editor.EDITOR_PAGE_ANNOUNCEMENT.name: ANNOUNCEMENT_TEXT
            }
        }
        self.post_json('/adminhandler', payload, csrf_token)

        response_dict = self.get_json('/adminhandler')
        response_config_properties = response_dict['config_properties']
        self.assertDictContainsSubset({
            'value': ANNOUNCEMENT_TEXT
        }, response_config_properties[editor.EDITOR_PAGE_ANNOUNCEMENT.name])

        self.logout()

    def test_change_splash_page_config_property(self):
        """Test that the correct variables show up on the splash page."""
        ACTUAL_SITE_NAME = 'oppia.org'

        # Navigate to the splash page. The site name is not set.
        response = self.testapp.get('/')
        self.assertIn('SITE_NAME', response.body)
        self.assertNotIn(ACTUAL_SITE_NAME, response.body)

        # Log in as an admin and customize the site name.
        self.login('admin@example.com', is_admin=True)

        response = self.testapp.get('/admin')
        csrf_token = self.get_csrf_token_from_response(response)
        self.post_json('/adminhandler', {
            'action': 'save_config_properties',
            'new_config_property_values': {
                pages.SITE_NAME.name: ACTUAL_SITE_NAME
            }
        }, csrf_token)

        self.logout()

        # Navigate to the splash page. The site name is set.
        response = self.testapp.get('/')
        self.assertNotIn('SITE_NAME', response.body)
        self.assertIn(ACTUAL_SITE_NAME, response.body)