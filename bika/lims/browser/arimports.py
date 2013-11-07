import csv
from DateTime import DateTime
from Products.CMFCore.utils import getToolByName
from Products.CMFPlone.utils import transaction_note
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from Products.statusmessages.interfaces import IStatusMessage
from bika.lims import PMF, logger, bikaMessageFactory as _
from bika.lims.browser import BrowserView
from bika.lims.browser.bika_listing import BikaListingView
from bika.lims.permissions import *
from bika.lims.interfaces import IARImport
from bika.lims.utils import tmpID
from plone.app.layout.globals.interfaces import IViewView
from zope.interface import implements
import plone
import zope.event


class ARImportView(BrowserView):
    implements(IViewView)

    def getImportOption(self):
        return self.context.getImportOption()

    def getDateImported(self):
        dt = self.context.getDateImported()
        if dt:
            plone_view = self.context.restrictedTraverse('@@plone')
            return plone_view.toLocalizedTime(dt, long_format=1)

    def getDateApplied(self):
        dt = self.context.getDateApplied()
        if dt:
            plone_view = self.context.restrictedTraverse('@@plone')
            return plone_view.toLocalizedTime(dt, long_format=1)

    def validate_arimport(self):
        """ validate the current ARImport object """
        request = self.request
        arimport = self.context
        if arimport.getImportOption() in ('c', 'p'):
            valid = arimport.validateIt()
            if not valid:
                msg = 'AR Import invalid'
                IStatusMessage(request).addStatusMessage(_(msg), "error")
        else:
            msg = 'validation not yet implemented'
            istatusmessage(request).addstatusmessage(_(msg), "error")
        request.response.redirect('%s/view' % arimport.absolute_url())

    def isSubmitted(self):
        wftool = getToolByName(self, 'portal_workflow')
        return wftool.getInfoFor(
                self.context.aq_parent, 'review_state') == 'submitted'
        

class ClientARImportsView(BikaListingView):
    implements(IViewView)

    def __init__(self, context, request):
        super(ClientARImportsView, self).__init__(context, request)
        self.catalog = "portal_catalog"
        self.contentFilter = {
                'portal_type': 'ARImport',
                'path': {'query': '/'.join(self.context.getPhysicalPath())},
                'sort_on':'sortable_title',
                }
        self.context_actions = \
                {_('AR Import'):
                           {'url': 'arimport_add',
                            'icon': '++resource++bika.lims.images/add.png'}}
        self.show_sort_column = False
        self.show_select_row = False
        self.show_select_column = False
        self.pagesize = 50
        self.form_id = "arimports"

        self.icon = \
            self.portal_url + "/++resource++bika.lims.images/arimport_big.png"
        self.title = _("Analysis Request Imports")
        self.description = ""

        self.columns = {
            'title': {'title': _('Import')},
            'getDateImported': {'title': _('Date Imported')},
            'getStatus': {'title': _('Validity')},
            'getDateApplied': {'title': _('Date Submitted')},
            'state_title': {'title': _('State')},
        }
        self.review_states = [
            {'id':'default',
             'title': _('All'),
             'contentFilter':{},
             'columns': ['title',
                         'getDateImported',
                         'getStatus',
                         'getDateApplied',
                         'state_title']},
            {'id':'imported',
             'title': _('Imported'),
             'contentFilter':{'review_state':'imported'},
             'columns': ['title',
                         'getDateImported',
                         'getStatus']},
            {'id':'submitted',
             'title': _('Applied'),
             'contentFilter':{'review_state':'submitted'},
             'columns': ['title',
                         'getDateImported',
                         'getStatus',
                         'getDateApplied']},
        ]

    def folderitems(self):
        items = BikaListingView.folderitems(self)
        for x in range(len(items)):
            if not items[x].has_key('obj'): continue

            items[x]['replace']['title'] = "<a href='%s'>%s</a>" % \
                 (items[x]['url'], items[x]['title'])

        return items

    def get_toggles(self, workflow_type):
        if workflow_type == 'sample':
            states = context.sample_workflow_states()
        elif workflow_type == 'standardsample':
            states = context.standardsample_workflow_states()
        elif workflow_type == 'order':
            states = context.order_workflow_states()
        elif workflow_type == 'analysisrequest':
            states = context.analysis_workflow_states()
        elif workflow_type == 'worksheet':
            states = context.worksheet_workflow_states()
        elif workflow_type == 'arimport':
            states = context.arimport_workflow_states()
        else:
             states = []

        toggles = []
        toggle_cats = ({'id':'all', 'title':'All'},)
        for cat in toggle_cats:
            toggles.append( {'id': cat['id'], 'title': cat['title']} )
        for state in states:
            toggles.append(state)
        return toggles
    
    def getAR(self):
        import pdb; pdb.set_trace()


class ClientARImportAddView(BrowserView):
    implements(IViewView)
    template = ViewPageTemplateFile('templates/arimport_add_form.pt')

    def __call__(self):
        request = self.request
        form = request.form
        plone.protect.CheckAuthenticator(form)
        if form.get('submitted'): 
            csvfile = form.get('csvfile')
            option = form.get('ImportOption')
            client_id = form.get('ClientID')
            valid = False
            if option in ('c', 'p'):
                arimport, msg = self._import_file(option, csvfile, client_id)
            else:
                msg = "Import Option not yet available"
                IStatusMessage(request).addStatusMessage(_(msg), "warn")
                request.response.redirect('%s/arimports' % (
                    self.context.absolute_url()))
                return 

            if arimport:
                msg = "AR Import complete"
                IStatusMessage(request).addStatusMessage(_(msg), "info")
                request.response.redirect(arimport.absolute_url())
                return 
            else:
                IStatusMessage(request).addStatusMessage(_(msg), "error")
                request.response.redirect('%s/arimport_add' % (
                    self.context.absolute_url()))
                return 
        return self.template()

    def _import_file(self, importoption, csvfile, client_id):
        fullfilename = csvfile.filename
        fullfilename = fullfilename.split('/')[-1]
        filename = fullfilename.split('.')[0]
        log = []
        r = self.portal_catalog(portal_type='Client', id=client_id)
        if len(r) == 0:
            #This is not a user input issue - client_id is added to template
            log.append('   Could not find Client %s' % client_id)
            return None, '\n'.join(log)

        client = r[0].getObject()
        updateable_states = ['sample_received', 'assigned']
        reader = csv.reader(csvfile.readlines())
        samples = []
        sample_headers = None
        batch_headers = None
        batch_remarks = []
        row_count = 0
        for row in reader:
            row_count = row_count + 1
            if not row: 
                continue
            # a new batch starts
            if row_count == 1:
                if row[0] == 'Header':
                    continue
                else:
                    msg = '%s invalid batch header' % row
                    transaction_note(msg)
                    return None, msg
            elif row_count == 2:
                msg = None
                if row[1] != 'Import':
                    msg = 'Invalid batch header - Import required in cell B2'
                    transaction_note(msg)
                    return None, msg
                entered_name = fullfilename.split('.')[0]
                if not row[2] or entered_name.lower() != row[2].lower():
                    msg = 'Filename, %s, does not match entered filename, %s' \
                            % (filename, row[2])
                    transaction_note(msg)
                    return None, msg
                
                batch_headers = row[0:]
                arimport_id = tmpID()
                title = filename
                idx = 1
                while title in [i.Title() for i in client.objectValues()]:
                    title = '%s-%s' % (filename, idx)
                    idx += 1
                client.invokeFactory(
                        id=arimport_id, type_name='ARImport', title=title)
                arimport = client._getOb(arimport_id)
                continue
            elif row_count == 3:
                sample_headers = row[9:]
                continue
            elif row_count in [4,5,6]:
                continue

            #otherwise add to list of sample
            samples.append(row)

        pad = 8192*' '
        request = self.request
        #request.response.write(self.progress_bar(request=request))
        #request.response.write('<input style="display: none;" id="progressType" value="Analysis request import">')
        #request.response.write('<input style="display: block;" id="progressDone" value="Validating...">')
        #request.response.write(pad+'<input style="display: block;" id="inputTotal" value="%s">' % len(samples))

        row_count = 0
        for sample in samples:
            next_num = tmpID()
            row_count = row_count + 1
            #request.response.write(pad+'<input style="display: none;" name="inputProgress" value="%s">' % row_count)
            item_remarks = []
            analyses = []
            for i in range(9, len(sample)):
                if sample[i] != '1':
                    continue
                analyses.append(sample_headers[(i-9)])
            if len(analyses) > 0:
                aritem_id = '%s_%s' %('aritem', (str(next_num)))
                arimport.invokeFactory(id=aritem_id, type_name='ARImportItem')
                aritem = arimport._getOb(aritem_id)
                aritem.edit(
                    SampleName=sample[0],
                    ClientRef=sample[1],
                    SampleDate=sample[2],
                    SampleType = sample[3],
                    PickingSlip = sample[4],
                    ContainerType = sample[5],
                    ReportDryMatter = sample[6],
                    Priority = sample[7],
                    )
            
                aritem.setRemarks(item_remarks)
                if importoption == 'c':
                    aritem.setAnalyses(analyses)
                elif importoption == 'p':
                    aritem.setAnalysisProfile(analyses)

        cc_names_report = ','.join(
                [i.strip() for i in batch_headers[6].split(';')])
        cc_emails_report = ','.join(
                [i.strip() for i in batch_headers[7].split(';')])
        cc_emails_invoice = ','.join(
                [i.strip() for i in batch_headers[8].split(';')])

        try:
            numOfSamples = int(batch_headers[12])
        except:
            numOfSamples = 0
        arimport.edit(
            ImportOption=importoption,
            FileName=batch_headers[2],
            OriginalFile=csvfile,
            ClientTitle = batch_headers[3],
            ClientID = batch_headers[4],
            ContactID = batch_headers[5],
            CCNamesReport = cc_names_report,
            CCEmailsReport = cc_emails_report,
            CCEmailsInvoice = cc_emails_invoice,
            OrderID = batch_headers[9],
            QuoteID = batch_headers[10],
            SamplePoint = batch_headers[11],
            NumberSamples = numOfSamples,
            Remarks = batch_remarks, 
            Analyses = sample_headers, 
            DateImported=DateTime(),
            )

        valid = arimport.validateIt()
        #request.response.write('<script>document.location.href="%s/client_arimports?portal_status_message=%s%%20imported"</script>' % (client.absolute_url(), arimport_id))
        return arimport, msg
