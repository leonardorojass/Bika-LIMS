*** Settings ***

Library                 Selenium2Library  timeout=10  implicit_wait=0.2
Library                 Collections
Resource                keywords.txt
Variables               plone/app/testing/interfaces.py

Suite Setup             Start browser
Suite Teardown          Close All Browsers

*** Variables ***

${SELENIUM_SPEED}  0
${PLONEURL}        http://localhost:55001/plone
${ar_factory_url}  portal_factory/AnalysisRequest/Request new analyses/ar_add

*** Test Cases ***

Analysis Request with no samping or preservation workflow
    Log in                    test_labmanager1    test_labmanager1
    Go to                     ${PLONEURL}/clients/client-1/${ar_factory_url}?col_count=1
    ${ar_id}=                 Complete ar_add form with template Borehole 12 Hardness
    Check Sample Category exists ${ar_id}

    Go to                     ${PLONEURL}/clients/client-1/${ar_factory_url}?col_count=1
    ${ar_id}=                 Complete ar_add form without template

    Go to                     ${PLONEURL}/clients/client-1/analysisrequests
    Execute transition receive on items in form_id analysisrequests
    Log out
    Log in                    test_analyst    test_analyst
    Go to                     ${PLONEURL}/clients/client-1/${ar_id}/manage_results
    Submit results with out of range tests
    Log out

    Log in                    test_labmanager1    test_labmanager1
    Add new Copper analysis to ${ar_id}
    ${ar_id} state should be sample_received
    Go to                     ${PLONEURL}/clients/client-1/${ar_id}/base_view
    Execute transition verify on items in form_id lab_analyses
    Log out
    Log in                    test_labmanager    test_labmanager
    # There is no "retract" transition on verified analyses - but there should/will be.
    # Go to                     ${PLONEURL}/clients/client-1/${ar_id}/base_view
    # Execute transition retract on items in form_id lab_analyses





# XXX Automatic expanded categories
# XXX Restricted categories

# XXX samplingworkflow
# XXX preservation workflow

# XXX field analyses
# XXX copy across in all fields



*** Keywords ***

Start browser
    Open browser        ${PLONEURL}/login_form
    Log in              test_labmanager    test_labmanager
    Set Selenium Speed  ${SELENIUM_SPEED}

Complete ar_add form with template ${template}
    Select from dropdown        ar_0_Contact  Rita Mohale
    @{time} =                   Get Time        year month day hour min sec
    SelectDate                  ar_0_SamplingDate   @{time}[2]
    Select from dropdown        ar_0_Template       ${template}
    Set Selenium Timeout        30
    Click Button                Save
    Wait until page contains    created
    Set Selenium Timeout        10
    ${ar_id} =                  Get text      //dl[contains(@class, 'portalMessage')][2]/dd
    ${ar_id} =                  Set Variable  ${ar_id.split()[2]}
    Page should contain         Sample Category
    Page should contain         Clinical
    [return]                    ${ar_id}

Complete ar_add form Without template
    Select from dropdown        ar_0_Contact  Rita Mohale
    @{time} =                  Get Time        year month day hour min sec
    SelectDate                 ar_0_SamplingDate   @{time}[2]
    Select From Dropdown       ar_0_SampleType    Water
    Select From Dropdown       ar_0_SampleCategory  Food
    Set Selenium Timeout       30
    Click Element              xpath=//th[@id='cat_lab_Water Chemistry']
    Select Checkbox            xpath=//input[@title='Moisture' and @name='ar.0.Analyses:list:ignore_empty:record']
    Click Element              xpath=//th[@id='cat_lab_Metals']
    Select Checkbox            xpath=//input[@title='Calcium' and @name='ar.0.Analyses:list:ignore_empty:record']
    Select Checkbox            xpath=//input[@title='Phosphorus' and @name='ar.0.Analyses:list:ignore_empty:record']
    Click Element              xpath=//th[@id='cat_lab_Microbiology']
    Select Checkbox            xpath=//input[@title='Clostridia' and @name='ar.0.Analyses:list:ignore_empty:record']
    Select Checkbox            xpath=//input[@title='Ecoli' and @name='ar.0.Analyses:list:ignore_empty:record']
    Select Checkbox            xpath=//input[@title='Enterococcus' and @name='ar.0.Analyses:list:ignore_empty:record']
    Select Checkbox            xpath=//input[@title='Salmonella' and @name='ar.0.Analyses:list:ignore_empty:record']
    Set Selenium Timeout       30
    Click Button               Save
    Wait until page contains   created
    Set Selenium Timeout       10
    ${ar_id} =                 Get text      //dl[contains(@class, 'portalMessage')][2]/dd
    ${ar_id} =                 Set Variable  ${ar_id.split()[2]}
    Page should contain        Sample Category
    Page should contain        Clinical
    [return]                   ${ar_id}

Submit results with out of range tests
    [Documentation]   Complete all received analysis result entry fields
    ...               Do some out-of-range checking, too

    ${count} =                 Get Matching XPath Count    //input[@type='text' and @field='Result']
    ${count} =                 Convert to integer    ${count}
    :FOR    ${index}           IN RANGE    1   ${count+1}
    \    TestResultsRange      xpath=(//input[@type='text' and @field='Result'])[${index}]       5   10
    Click Element              xpath=//input[@value='Submit for verification'][1]
    Wait Until Page Contains   Changes saved.

Submit results
    [Documentation]   Complete all received analysis result entry fields

    ${count} =                 Get Matching XPath Count    //input[@type='text' and @field='Result']
    ${count} =                 Convert to integer    ${count}
    :FOR    ${index}           IN RANGE    1   ${count+1}
    \    Input text            xpath=(//input[@type='text' and @field='Result'])[${index}]   10
    Click Element              xpath=//input[@value='Submit for verification'][1]
    Wait Until Page Contains   Changes saved.

Add new ${service} analysis to ${ar_id}
    Go to                      ${PLONEURL}/clients/client-1/${ar_id}/analyses
    select checkbox            xpath=//input[@alt='Select ${service}']
    click element              save_analyses_button_transition
    wait until page contains   saved.

${ar_id} state should be ${state_id}
    Go to                        ${PLONEURL}/clients/client-1/${ar_id}
    log     span.state-${state_id}   warn
    Page should contain element  css=span.state-${state_id}

TestResultsRange
    [Arguments]  ${locator}=
    ...          ${badResult}=
    ...          ${goodResult}=

    # Log  Testing Result Range for ${locator} -:- values: ${badResult} and ${goodResult}  WARN

    Input Text          ${locator}  ${badResult}
    Press Key           ${locator}   \\9
    Expect exclamation
    Input Text          ${locator}  ${goodResult}
    Press Key           ${locator}   \\9
    Expect no exclamation

Expect exclamation
    sleep  .5
    Page should contain Image   ${PLONEURL}/++resource++bika.lims.images/exclamation.png

Expect no exclamation
    sleep  .5
    Page should not contain Image  ${PLONEURL}/++resource++bika.lims.images/exclamation.png

TestSampleState
    [Arguments]  ${locator}=
    ...          ${sample}=
    ...          ${expectedState}=

    ${VALUE}  Get Value  ${locator}
    Should Be Equal  ${VALUE}  ${expectedState}  ${sample} Workflow States incorrect: Expected: ${expectedState} -
    # Log  Testing Sample State for ${sample}: ${expectedState} -:- ${VALUE}  WARN

Check Sample Category exists ${ar_id}
    Go to                     ${PLONEURL}/clients/client-1/${ar_id}
    Page should contain     Clinical

    Go to                     ${PLONEURL}/samples
    Page should contain     Sample Category
    Page should contain     Clinical

    Go to                     ${PLONEURL}/analysisrequests
    Page should contain     Sample Category
    Page should contain     Clinical
