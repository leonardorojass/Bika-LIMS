"""Analysis result range specifications for a client
"""
from AccessControl import ClassSecurityInfo
from AccessControl.Permissions import delete_objects
from Products.ATContentTypes.content import schemata
from Products.ATContentTypes.lib.historyaware import HistoryAwareMixin
from Products.ATExtensions.field.records import RecordsField
from Products.Archetypes import atapi
from Products.Archetypes.config import REFERENCE_CATALOG
from Products.Archetypes.public import *
from Products.Archetypes.references import HoldingReference
from Products.Archetypes.utils import shasattr
from Products.CMFCore import permissions
from Products.CMFCore.WorkflowCore import WorkflowException
from Products.CMFCore.permissions import ListFolderContents, View
from Products.CMFCore.utils import getToolByName
from Products.CMFPlone.utils import safe_unicode
from bika.lims import PMF, bikaMessageFactory as _
from bika.lims.browser.fields import HistoryAwareReferenceField
from bika.lims.browser.widgets import AnalysisSpecificationWidget
from bika.lims.config import PROJECTNAME
from bika.lims.content.bikaschema import BikaSchema
from bika.lims.interfaces import IAnalysisSpec
from types import ListType, TupleType
from zope.i18n import translate
from zope.interface import implements
import sys
import time

schema = Schema((
    HistoryAwareReferenceField('SampleType',
        # schemata = 'Description',
        # required = 1,
        vocabulary = "getSampleTypes",
        vocabulary_display_path_bound = sys.maxint,
        allowed_types = ('SampleType',),
        relationship = 'AnalysisSpecSampleType',
        referenceClass = HoldingReference,
        widget = ReferenceWidget(
            checkbox_bound = 0,
            label = _("Sample Type"),
        ),
    ),
    ComputedField('SampleTypeTitle',
        expression = "context.getSampleType().Title() if context.getSampleType() else ''",
        widget = ComputedWidget(
            visible = False,
        ),
    ),
    ComputedField('SampleTypeUID',
        expression = "context.getSampleType().UID() if context.getSampleType() else ''",
        widget = ComputedWidget(
            visible = False,
        ),
    ),
)) + \
BikaSchema.copy() + \
Schema((
    RecordsField('ResultsRange',
        # schemata = 'Specifications',
        required = 1,
        type = 'analysisspec',
        subfields = ('keyword', 'min', 'max', 'error'),
        required_subfields = ('keyword', 'min', 'max'),
        subfield_validators = {'min':'analysisspecs_validator',
                               'max':'analysisspecs_validator',
                               'error':'analysisspecs_validator'},
        subfield_labels = {'keyword': _('Analysis Service'),
                           'min': _('Min'),
                           'max': _('Max'),
                           'error': _('% Error')},
        widget = AnalysisSpecificationWidget(
            checkbox_bound = 0,
            label = _("Specifications"),
            description = _("Click on Analysis Categories (against shaded background) "
                            "to see Analysis Services in each category. Enter minimum "
                            "and maximum values to indicate a valid results range. "
                            "Any result outside this range will raise an alert. "
                            "The % Error field allows for an % uncertainty to be "
                            "considered when evaluating results against minimum and "
                            "maximum values. A result out of range but still in range "
                            "if the % error is taken into consideration, will raise a "
                            "less severe alert."),
        ),
    ),
    ComputedField('ClientUID',
        expression = "context.aq_parent.UID()",
        widget = ComputedWidget(
            visible = False,
        ),
    ),
))
# schema['description'].schemata = 'Description'
schema['description'].widget.visible = True
# schema['title'].schemata = 'Description'
schema['title'].required = True
# schema['title'].widget.visible = False

class AnalysisSpec(BaseFolder, HistoryAwareMixin):
    implements(IAnalysisSpec)
    security = ClassSecurityInfo()
    schema = schema
    displayContentsTab = False

    _at_rename_after_creation = True
    def _renameAfterCreation(self, check_auto_id=False):
        from bika.lims.idserver import renameAfterCreation
        renameAfterCreation(self)

    def Title(self):
        if not self.id:
            # this won't work too early in the creation stage
            return ''
        if not self.title:
            title = self.getSampleType().Title() \
                if self.getSampleType() \
                else self.id
            return title
        return self.title

    def contextual_title(self):
        parent = self.aq_parent
        if parent == self.bika_setup.bika_analysisspecs:
            return self.title + " ("+translate(_("Lab"))+")"
        else:
            return self.title + " ("+translate(_("Client"))+")"

    security.declarePublic('getSpecCategories')
    def getSpecCategories(self):
        bsc = getToolByName(self, 'bika_setup_catalog')
        categories = []
        for spec in self.getResultsRange():
            keyword = spec['keyword']
            service = bsc(portal_type="AnalysisService",
                          getKeyword = keyword)
            if service.getCategoryUID() not in categories:
                categories.append(service.getCategoryUID())
        return categories

    security.declarePublic('getResultsRangeDict')
    def getResultsRangeDict(self):
        specs = {}
        for spec in self.getResultsRange():
            keyword = spec['keyword']
            specs[keyword] = {}
            specs[keyword]['min'] = spec['min']
            specs[keyword]['max'] = spec['max']
            specs[keyword]['error'] = spec['error']
        return specs

    security.declarePublic('getResultsRangeSorted')
    def getResultsRangeSorted(self):
        tool = getToolByName(self, REFERENCE_CATALOG)

        cats = {}
        for spec in self.getResultsRange():
            service = tool.lookupObject(spec['service'])
            service_title = service.Title()
            category_title = service.getCategoryTitle()
            if not cats.has_key(category_title):
                cats[category_title] = {}
            cat = cats[category_title]
            cat[service_title] = {'category': category_title,
                                  'service': service_title,
                                  'id': service.getId(),
                                  'uid': spec['service'],
                                  'min': spec['min'],
                                  'max': spec['max'],
                                  'error': spec['error'] }
        cat_keys = cats.keys()
        cat_keys.sort(lambda x, y:cmp(x.lower(), y.lower()))
        sorted_specs = []
        for cat in cat_keys:
            services = cats[cat]
            service_keys = services.keys()
            service_keys.sort(lambda x, y:cmp(x.lower(), y.lower()))
            for service_key in service_keys:
                sorted_specs.append(services[service_key])

        return sorted_specs

    security.declarePublic('getRemainingSampleTypes')
    def getSampleTypes(self):
        """ return all sampletypes """
        sampletypes = []
        bsc = getToolByName(self, 'bika_setup_catalog')
        for st in bsc(portal_type = 'SampleType',
                      sort_on = 'sortable_title'):
            sampletypes.append((st.UID, st.Title))

        return DisplayList(sampletypes)


atapi.registerType(AnalysisSpec, PROJECTNAME)
