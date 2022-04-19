#! /usr/bin/env python3
# -*- coding: utf-8 -*-

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import os
import sys
import shutil
import optparse
import subprocess

def make_pot():
    print("Make locale/messages.pot")
    subprocess.check_call(['xgettext', '-o', 'messages.pot', '-p', 'locale',
                           '-L', 'Javascript', 'www/main.js'
                           ])
    return

def make_po(languages):
    print("Merge locale/messages.pot into locale/*/LC_MESSAGES/messages.po")
    for l in languages:
        print(" * %s" % l)
        subprocess.check_call(['msgmerge', '-U',
                               'locale/%s/LC_MESSAGES/messages.po' % l,
                               'locale/messages.pot'])
    return

def compile_mo(languages):
    print("Compile locale/*/LC_MESSAGES/messages.mo files")
    for l in languages:
        print(" * %s" % l)
        subprocess.check_call(['msgfmt', '-o',
                               'locale/%s/LC_MESSAGES/messages.mo' %l,
                               'locale/%s/LC_MESSAGES/messages.po' %l])
    return

def compile_js(languages):
    print("Compile locale/*/LC_MESSAGES/messages.js files")
    for l in languages:
        print(" * %s" % l)
        jsfile = 'www/l10n-%s.js' %l
        subprocess.check_call(['www/node_modules/gettext.js/bin/po2json',
                               'locale/%s/LC_MESSAGES/messages.po' %l,
                               jsfile, '-p'])
        fd = open(jsfile, "r")
        data = fd.read()
        fd.close()

        fd = open(jsfile, "w")
        fd.write('var l10n_%s' %l)
        fd.write(' = ')
        fd.write(data)
        fd.close()
        
    return

def create_language(country_code):
    print("Create directory for %s" % country_code)
    os.makedirs('locale/%s/LC_MESSAGES' % country_code)
    shutil.copyfile('locale/messages.pot',
                    'locale/%s/LC_MESSAGES/messages.po' % country_code)
    return

def get_languages():
    l = os.listdir('locale')
    return filter(lambda s: s!='messages.pot', l)

def main():
    usage = '%prog [options]\n'

    parser = optparse.OptionParser(usage=usage)
    parser.add_option('-P', '--make-pot', dest='make_pot',
                      action='store_true', default=False,
                      help="make locale/messages.pot")
    parser.add_option('-p', '--make-po', dest='make_po',
                      action='store_true', default=False,
                      help="merge locale/messages.pot with locale/*/LC_MESSAGES/messages.po")
    parser.add_option('-m', '--compile-mo', dest='compile_mo',
                      action='store_true', default=False,
                      help="compile locale/*/LC_MESSAGES/messages.mo files")
    parser.add_option('-j', '--compile-js', dest='compile_js',
                      action='store_true', default=False,
                      help="compile locale/*/LC_MESSAGES/messages.js files")
    parser.add_option('-n', '--new-language', dest='new_language',
                      metavar='LANGUAGE_CODE',
                      help='create .pot file for a new language. '
                      'LANGUAGE_CODE is like "fr_FR".',
                      default=None)

    (options, args) = parser.parse_args()
    if len(args):
        parser.print_help()
        return 1

    languages = get_languages()

    if options.make_pot:
        make_pot()
    if options.make_po:
        make_po(languages)
    if options.compile_mo:
        compile_mo(languages)
    if options.compile_js:
        compile_js(languages)
    if options.new_language:
        create_language(options.new_language)

if __name__ == '__main__':
    sys.exit(main())
