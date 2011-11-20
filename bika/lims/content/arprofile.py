"""
    AnalysisRequests often use the same configurations.
    ARProfile is used to save these common configurations (templates).
"""

from AccessControl import ClassSecurityInfo
from Products.Archetypes.public import *
from Products.Archetypes.references import HoldingReference
from Products.CMFCore.permissions import View, ModifyPortalContent
from bika.lims.browser.widgets import ServicesWidget
from bika.lims.config import I18N_DOMAIN, PROJECTNAME
from bika.lims.content.bikaschema import BikaSchema
import sys
from bika.lims import bikaMessageFactory as _

schema = BikaSchema.copy() + Schema((
    StringField('ProfileKey',
        schemata = 'Description',
        widget = StringWidget(
            label = _("Profile Keyword"),
            description = _("The profile's keyword is used to uniquely identify "
                            "it in import files. It has to be unique"),
        ),
    ),
    ReferenceField('Service',
        schemata = 'Analyses',
        required = 1,
        multiValued = 1,
        allowed_types = ('AnalysisService',),
        relationship = 'ARProfileAnalysisService',
        widget = ServicesWidget(
            label = _("Analyses"),
            description = _("The analyses included in this profile, grouped per category"),
        )
    ),
    # indexed value for getService
    ComputedField('ServiceName',
        expression = "context.getService() and context.getService().Title() or ''",
        widget = ComputedWidget(
            visible = False,
        ),
    ),
    TextField('Notes',
        schemata = 'Description',
        default_content_type = 'text/plain',
        allowable_content_types = ('text/plain',),
        widget = TextAreaWidget(
            label = _("Remarks"),
        ),
    ),
    ComputedField('ClientUID',
        expression = 'here.aq_parent.UID()',
        widget = ComputedWidget(
            visible = False,
        ),
    ),
),
)
schema['title'].widget.visible = True
schema['title'].schemata = 'Description'
schema['description'].widget.visible = True
schema['description'].schemata = 'Description'
IdField = schema['id']

class ARProfile(BaseContent):
    security = ClassSecurityInfo()
    schema = schema
    displayContentsTab = False


registerType(ARProfile, PROJECTNAME)
