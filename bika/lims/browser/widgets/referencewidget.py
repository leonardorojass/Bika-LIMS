import ast
import json
import plone
from AccessControl import ClassSecurityInfo
from bika.lims import bikaMessageFactory as _
from bika.lims.browser import BrowserView
from bika.lims.interfaces import IReferenceWidgetVocabulary
from bika.lims.permissions import *
from bika.lims.utils import to_unicode as _u
from bika.lims.utils import to_utf8 as _c
from operator import itemgetter
from Products.Archetypes.Registry import registerWidget
from Products.Archetypes.Widget import StringWidget
from Products.CMFCore.utils import getToolByName
from zope.component import getAdapters

class ReferenceWidget(StringWidget):
    _properties = StringWidget._properties.copy()
    _properties.update({
        'macro': "bika_widgets/referencewidget",
        'helper_js': ("bika_widgets/referencewidget.js",),
        'helper_css': ("bika_widgets/referencewidget.css",),

        'url': 'referencewidget_search',
        'catalog_name': 'portal_catalog',

        # base_query can be a dict or a callable returning a dict
        'base_query': {},

        # columnName must contain valid index names
        'colModel': [
            {'columnName': 'Title', 'width': '30', 'label': _(
                'Title'), 'align': 'left'},
            {'columnName': 'Description', 'width': '70', 'label': _(
                'Description'), 'align': 'left'},
            # UID is required in colModel
            {'columnName': 'UID', 'hidden': True},
        ],

        # Default field to put back into input elements
        'ui_item': 'Title',
        'search_fields': ('Title',),
        'discard_empty': [],
        'popup_width': '550px',
        'showOn': 'false',
        'sord': 'asc',
        'sidx': 'Title',
        'force_all': 'true',
        'portal_types': {}
    })
    security = ClassSecurityInfo()

    security.declarePublic('process_form')

    def process_form(self, instance, field, form, empty_marker=None,
                     emptyReturnsMarker=False):
        """Return a UID so that ReferenceField understands.
        """
        fieldName = field.getName()
        if fieldName + "_uid" in form:
            uid = form.get(fieldName + "_uid", '')
        elif fieldName in form:
            uid = form.get(fieldName, '')
        else:
            uid = None
        return uid, {}

    def get_combogrid_options(self, context, fieldName):
        colModel = self.colModel
        if 'UID' not in [x['columnName'] for x in colModel]:
            colModel.append({'columnName': 'UID', 'hidden': True})
        options = {
            'url': self.url,
            'colModel': colModel,
            'showOn': self.showOn,
            'width': self.popup_width,
            'sord': self.sord,
            'sidx': self.sidx,
            'force_all': self.force_all,
            'search_fields': self.search_fields,
            'discard_empty': self.discard_empty,
        }
        return json.dumps(options)

    def get_base_query(self, context, fieldName):
        base_query = self.base_query
        if callable(base_query):
            base_query = base_query()
        if base_query and isinstance(base_query, basestring):
            base_query = json.loads(base_query)

        # portal_type: use field allowed types
        field = context.Schema().getField(fieldName)
        allowed_types = getattr(field, 'allowed_types', None)
        allowed_types_method = getattr(field, 'allowed_types_method', None)
        if allowed_types_method:
            meth = getattr(content_instance, allowed_types_method)
            allowed_types = meth(field)
        # If field has no allowed_types defined, use widget's portal_type prop
        base_query['portal_type'] = allowed_types \
            if allowed_types \
            else self.portal_types

        return json.dumps(self.base_query)

registerWidget(ReferenceWidget, title='Reference Widget')

class ajaxReferenceWidgetSearch(BrowserView):

    """ Source for jquery combo dropdown box
    """

    def __call__(self):
        plone.protect.CheckAuthenticator(self.request)
        page = self.request['page']
        nr_rows = self.request['rows']
        sord = self.request['sord']
        sidx = self.request['sidx']
        colModel = json.loads(_u(self.request.get('colModel', '[]')))
        discard_empty = json.loads(_c(self.request.get('discard_empty', "[]")))
        rows = []

        brains = []
        for name, adapter in getAdapters(
                (self.context, self.request), IReferenceWidgetVocabulary):
            brains.extend(adapter())


        for p in brains:
            row = {'UID': getattr(p, 'UID'),
                   'Title': getattr(p, 'Title')}
            other_fields = [x for x in colModel
                            if x['columnName'] not in row.keys()]
            instance = schema = None
            discard = False
            # This will be faster if the columnNames are catalog indexes
            for field in other_fields:
                fieldname = field['columnName']
                value = getattr(p, fieldname, None)
                if not value:
                    if instance is None:
                        instance = p.getObject()
                        schema = instance.Schema()
                    if fieldname in schema:
                        value = schema[fieldname].get(instance)
                if fieldname in discard_empty and not value:
                    discard = True
                    break

                # '&nbsp;' instead of '' because empty div fields don't render
                # correctly in combo results table
                row[fieldname] = value and value or '&nbsp;'

            if discard is False:
                rows.append(row)

        rows = sorted(rows, cmp=lambda x, y: cmp(
            str(x).lower(), str(y).lower()),
            key=itemgetter(sidx and sidx or 'Title'))
        if sord == 'desc':
            rows.reverse()
        pages = len(rows) / int(nr_rows)
        pages += divmod(len(rows), int(nr_rows))[1] and 1 or 0
        start = (int(page) - 1) * int(nr_rows)
        end = int(page) * int(nr_rows)
        ret = {'page': page,
               'total': pages,
               'records': len(rows),
               'rows': rows[start:end]}

        return json.dumps(ret)
