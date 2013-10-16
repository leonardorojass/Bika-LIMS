import csv
from DateTime import DateTime
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from bika.lims import PMF, logger, bikaMessageFactory as _
from bika.lims.browser import BrowserView
from bika.lims.browser.bika_listing import BikaListingView
from bika.lims.permissions import *
from bika.lims.utils import tmpID
from plone.app.layout.globals.interfaces import IViewView
from zope.interface import implements
import plone
import zope.event


class ARImportsView(BrowserView):
    implements(IViewView)
    template = ViewPageTemplateFile('templates/arimport_view.pt')

    def getImportOption(self):
        import pdb; pdb.set_trace()
        return self.context.getImportOption()

class ClientARImportsView(BikaListingView):
    implements(IViewView)

    def __init__(self, context, request):
        super(ClientARImportsView, self).__init__(context, request)
        self.catalog = "portal_catalog"
        self.contentFilter = {'portal_type': 'ARImport',
                              'sort_on':'sortable_title'}
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


class ClientARImportAddView(BrowserView):
    implements(IViewView)
    template = ViewPageTemplateFile('templates/arimport_add_form.pt')

    def __call__(self):
        form = self.request.form
        plone.protect.CheckAuthenticator(form)
        if form.get('submitted'): 
            csvfile = form.get('csvfile')
            option = form.get('ImportOption')
            client_id = form.get('ClientID')
            if option == 'c':
                self.import_file_c(csvfile, client_id)
            elif option == 's':
                self.import_file_s(csvfile, client_id)

        return self.template()

    def import_file_c(self, csvfile, client_id):
        filename = csvfile.filename
        slash = filename.rfind('\\')
        full_name = filename[slash+1:]
        ext = full_name.rfind('.')
        if ext == -1:
            actual_name = full_name
        else:
            actual_name = full_name[:ext]
        log = []
        r = self.portal_catalog(portal_type='Client', id=client_id)
        if len(r) == 0:
            log.append('   Could not find Client %s' % client_id)
            return '\n'.join(log)
        client = r[0].getObject()
        wf_tool = getToolByName(self, 'portal_workflow')
        updateable_states = ['sample_received', 'assigned']
        reader = csv.reader(csvfile.readlines())
        samples = []
        sample_headers = None
        batch_headers = None
        row_count = 0
        sample_count = 0
        batch_remarks = []

        for row in reader:
            row_count = row_count + 1
            if not row: continue
            # a new batch starts
            if row_count == 1:
                if row[0] == 'Header':
                    continue
                else:
                    msg = '%s invalid batch header' % row
                    transaction_note(msg)
                    return state.set(status='failure', portal_status_message=msg)
            if row_count == 2:
                msg = None
                if row[1] != 'Import':
                    msg = 'Invalid batch header - Import required in cell B2'
                    transaction_note(msg)
                    return state.set(status='failure', portal_status_message=msg)
                full_name = row[2]
                ext = full_name.rfind('.')
                if ext == -1:
                    entered_name = full_name
                else:
                    entered_name = full_name[:ext]
                if entered_name.lower() != actual_name.lower():
                    msg = 'Actual filename, %s, does not match entered filename, %s' %(actual_name, row[2])
                    transaction_note(msg)
                    return state.set(status='failure', portal_status_message=msg)
                
                batch_headers = row[0:]
                arimport_id = tmpID()
                client.invokeFactory(id=arimport_id, type_name='ARImport')
                arimport = client._getOb(arimport_id)
                continue
            if row_count == 3:
                sample_count = sample_count + 1
                sample_headers = row[9:]
                continue
            if row_count == 4:
                continue
            if row_count == 5:
                continue
            if row_count == 6:
                continue

            samples.append(row)
        
        pad = 8192*' '
        request = self.request
        #request.RESPONSE.write(self.progress_bar(request=request))
        request.RESPONSE.write('<input style="display: none;" id="progressType" value="Analysis request import">')
        request.RESPONSE.write('<input style="display: none;" id="progressDone" value="Validating...">')
        request.RESPONSE.write(pad+'<input style="display: none;" id="inputTotal" value="%s">' % len(samples))

        row_count = 0
        for sample in samples:
            next_num = tmpID()
            row_count = row_count + 1
            request.RESPONSE.write(pad+'<input style="display: none;" name="inputProgress" value="%s">' % row_count)
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
                    ClientSid=sample[2],
                    SampleDate=sample[3],
                    SampleType = sample[4],
                    PickingSlip = sample[5],
                    ReportDryMatter = sample[6],
                    )
            
                aritem.setRemarks(item_remarks)
                aritem.setAnalyses(analyses)

        arimport.edit(
            ImportOption='c',
            FileName=batch_headers[2],
            ClientName = batch_headers[3],
            ClientID = batch_headers[4],
            ContactID = batch_headers[5],
            CCContactID = batch_headers[6],
            CCEmails = batch_headers[7],
            OrderID = batch_headers[8],
            QuoteID = batch_headers[9],
            SamplePoint = batch_headers[10],
            Remarks = batch_remarks, 
            Analyses = sample_headers, 
            DateImported=DateTime(),
            )

        valid = self.validate_arimport_c(arimport)
        request.RESPONSE.write('<script>document.location.href="%s/client_arimports?portal_status_message=%s%%20imported"</script>' % (client.absolute_url(), arimport_id))

    def validate_arimport_c(self, arimport):
        context = self.context
        rc = context.reference_catalog
        client = arimport.aq_parent
        batch_remarks = []
        valid_batch = True
        order_id = arimport.getOrderID()
        uid = arimport.UID()
        batches = context.portal_catalog(portal_type='ARImport', 
                    getClientUID = client.UID(),
                    getOrderID=order_id)
        for batch in batches:
            if batch.UID == uid:
                continue
            oldbatch = batch.getObject()
            if oldbatch.getStatus():
                # then a previous valid batch exists
                batch_remarks.append('\n' + 'Duplicate order')

        # validate client
        if arimport.getClientID() != client.getClientID():
            batch_remarks.append('\n' + 'Client ID should be %s' %client.getClientID())
            valid_batch = False

        # validate contact
        contact_found = False 
        cc_contact_found = False 

        if arimport.getContact():
            contact_found = True
        else:
            contact_uname = arimport.getContactID()
            for contact in client.objectValues('Contact'):
                if contact.getUsername() == contact_uname:
                    arimport.edit(Contact=contact)
                    contact_found = True
                    break

        if arimport.getCCContact():
            cc_contact_found = True
        else:
            if arimport.getCCContactID():
                cccontact_uname = arimport.getCCContactID()
                for contact in client.objectValues('Contact'):
                    if contact.getUsername() == cccontact_uname:
                        arimport.edit(CCContact=contact)
                        cc_contact_found = True
                        break

        cccontact_uname = arimport.getCCContactID()

        if not contact_found:
            batch_remarks.append('\n' + 'Contact invalid')
            valid_batch = False
        if cccontact_uname != None and \
           cccontact_uname != '':
            if not cc_contact_found:
                batch_remarks.append('\n' + 'CC contact invalid')
                valid_batch = False

        # validate sample point
        samplepoint = arimport.getSamplePoint()
        if samplepoint != None:
            r = context.portal_catalog(portal_type='SamplePoint', 
                Title=samplepoint)
            if len(r) == 0:
                batch_remarks.append('\n' + 'New Sample point will be added')

        sampletypes = [p.Title for p in context.portal_catalog(portal_type="SampleType")]
        service_keys = []
        dependant_services = {}

        #TODO
        #for s in context.portal_catalog(portal_type="AnalysisService"):
        #    service = s.getObject()
        #    service_keys.append(service.getAnalysisKey())
        #    if service.getCalcType() == 'dep':
        #        dependant_services[service.getAnalysisKey()] = service

        aritems = arimport.objectValues('ARImportItem')
        for aritem in aritems:
            item_remarks = []
            valid_item = True
            if aritem.getSampleType() not in sampletypes:
                batch_remarks.append('\n' + '%s: Sample type %s invalid' %(aritem.getSampleName(), aritem.getSampleType()))
                item_remarks.append('\n' + 'Sample type %s invalid' %(aritem.getSampleType()))
                valid_item = False
            #validate Sample Date
            try:
                date_items = aritem.getSampleDate().split('/')
                test_date = DateTime(int(date_items[2]), int(date_items[1]), int(date_items[0]))
            except:
                valid_item = False
                batch_remarks.append('\n' + '%s: Sample date %s invalid' %(aritem.getSampleName(), aritem.getSampleDate()))
                item_remarks.append('\n' + 'Sample date %s invalid' %(aritem.getSampleDate()))

            analyses = aritem.getAnalyses()
            for analysis in analyses:
                if analysis not in service_keys:
                    batch_remarks.append('\n' + '%s: Analysis %s invalid' %(aritem.getSampleName(), analysis))
                    item_remarks.append('\n' + 'Analysis %s invalid' %(analysis))
                    valid_item = False
                # validate analysis dependancies
                reqd_analyses = []
                if dependant_services.has_key(analysis):
                    this_analysis = dependant_services[analysis]
                    required = context.get_analysis_dependancies(this_analysis)
                    reqd_analyses = required['keys']
                reqd_titles = ''
                for reqd in reqd_analyses:
                    if (reqd not in analyses):
                        if reqd_titles != '':
                            reqd_titles += ', '
                        reqd_titles += reqd
                if reqd_titles != '':
                    valid_item = False
                    batch_remarks.append('\n' + '%s: %s needs %s' \
                        %(aritem.getSampleName(), analysis, reqd_titles))
                    item_remarks.append('\n' + '%s needs %s' \
                        %(analysis, reqd_titles))

            # validate analysisrequest dependancies
            if aritem.getReportDryMatter().lower() == 'y':
                required = context.get_analysisrequest_dependancies('DryMatter')
                reqd_analyses = required['keys']
                reqd_titles = ''
                for reqd in reqd_analyses:
                    if reqd not in analyses:
                        if reqd_titles != '':
                            reqd_titles += ', '
                        reqd_titles += reqd

                if reqd_titles != '':
                    valid_item = False
                    batch_remarks.append('\n' + '%s: Report as Dry Matter needs %s' \
                        %(aritem.getSampleName(), reqd_titles))
                    item_remarks.append('\n' + 'Report as Dry Matter needs %s' \
                        %(reqd_titles))

            aritem.edit(
                Remarks=item_remarks)
            if not valid_item:
                valid_batch = False
        arimport.edit(
            Remarks=batch_remarks,
            Status=valid_batch)

        return valid_batch

    def import_file_s(self, csvfile, client_id, state):
        import csv

        log = []
        r = self.portal_catalog(portal_type='Client', id=client_id)
        if len(r) == 0:
            log.append('   Could not find Client %s' % client_id)
            return '\n'.join(log)
        client = r[0].getObject()
        wf_tool = getToolByName(self, 'portal_workflow')
        reader = csv.reader(csvfile)
        samples = []
        sample_headers = None
        batch_headers = None
        row_count = 0
        sample_count = 0
        batch_remarks = []
        in_footers = False
        last_rows = False
        temp_row = False
        temperature = ''

        for row in reader:
            row_count = row_count + 1
            if not row: continue

            if last_rows:
                continue
            if in_footers:
                continue
                if temp_row:
                    temperature = row[8]
                    temp_row = False
                    last_rows = True
                if row[8] == 'Temperature on Arrival:':
                    temp_row = True
                    continue
                

            if row_count > 11:
                if row[0] == '':
                    in_footers = True

            if row_count == 5:
                client_orderid = row[10]
                continue

            if row_count < 7:
                continue

            if row_count == 7:
                if row[0] != 'Client Name':
                    log.append('  Invalid file')
                    return '\n'.join(log)
                batch_headers = row[0:]
                arimport_id = tmpID()
                client.invokeFactory(id=arimport_id, type_name='ARImport')
                arimport = client._getOb(arimport_id)
                clientname = row[1]
                clientphone = row[5]
                continue

            if row_count == 8:
                clientaddress = row[1]
                clientfax = row[5]
                continue
            if row_count == 9:
                clientcity = row[1]
                clientemail = row[5]
                continue
            if row_count == 10:
                contact = row[1]
                ccemail = row[5]
                continue
            if row_count == 11:
                continue


            if not in_footers:
                samples.append(row)
        
        pad = 8192*' '
        request = self.request
        #request.RESPONSE.write(self.progress_bar(request=request))
        request.RESPONSE.write('<input style="display: none;" id="progressType" value="Analysis request import">')
        request.RESPONSE.write('<input style="display: none;" id="progressDone" value="Validating...">')
        request.RESPONSE.write(pad+'<input style="display: none;" id="inputTotal" value="%s">' % len(samples))

        row_count = 0
        for sample in samples:
            row_count = row_count + 1
            request.RESPONSE.write(pad+'<input style="display: none;" name="inputProgress" value="%s">' % row_count)

            profiles = []
            for profile in sample[6:8]:
                if profile != None:
                    profiles.append(profile.strip())

            analyses = []
            for analysis in sample[8:11]:
                if analysis != None:
                    analyses.append(analysis.strip())

            aritem_id = tmpID()
            arimport.invokeFactory(id=tmpID(), type_name='ARImportItem')
            aritem = arimport._getOb(aritem_id)
            aritem.edit(
                ClientRef=sample[0],
                ClientRemarks=sample[1],
                ClientSid=sample[2],
                SampleDate=sample[3],
                SampleType = sample[4],
                NoContainers = sample[5],
                AnalysisProfile = profiles,
                Analyses = analyses,
                )
            

        arimport.edit(
            ImportOption='s',
            ClientName = clientname,
            ClientID = client_id,
            ClientPhone = clientphone,
            ClientFax = clientfax,
            ClientAddress = clientaddress,
            ClientCity = clientcity,
            ClientEmail = clientemail,
            ContactName = contact,
            CCEmails = ccemail,
            Remarks = batch_remarks, 
            OrderID=client_orderid,
            Temperature=temperature,
            DateImported=DateTime(),
            )

        valid = self.validate_arimport_s(arimport)
        request.RESPONSE.write('<script>document.location.href="%s/client_arimports?portal_status_message=%s%%20imported"</script>' % (client.absolute_url(), arimport_id))


