var SearchPage = function() {
  this.input = element(by.css('ion-view[nav-view=active] #searchInputField'))
  this.results = element(by.css('ion-view[nav-view=active]')).all(by.repeater('book in vm.results'))
  this.backButton = element(by.css('div[nav-bar=active] .back-button'))
  this.clearSearchButton = element(by.css('ion-view[nav-view=active] #clearSearchBtn'))

  this.helpCard = element(by.css('ion-view[nav-view=active] swipe-card'))

  this.get = function() {
    browser.get('http://localhost:8100/#/search')
  }

  this.searchFor = function(query, clear) {
    if (clear !== false) this.input.clear()
    this.input.sendKeys(query)
    this.input.sendKeys(protractor.Key.ENTER)
  }

};


describe('search page', function() {
  it('should support back button', function() {

    // Open the search page
    var sp = new SearchPage()
    sp.get()
    expect(sp.helpCard.isDisplayed()).toBeTruthy()

    // Search for 'field theories'
    sp.searchFor('field theories')
    expect(sp.results.count()).toEqual(10)
    expect(sp.helpCard.isDisplayed()).toBeFalsy()

    // Enter some more text to search for 'field theories Eduardo'
    sp.searchFor(' Eduardo', false)
    expect(sp.results.count()).toEqual(4)

    // Enter some more text to search for 'field theories Eduardo Fradkin'
    sp.searchFor(' Fradkin', false)
    expect(sp.results.count()).toEqual(2)

    // Click back button to get back to the search for 'Eduardo'
    sp.backButton.click()
    expect(sp.input.getAttribute('value')).toEqual('field theories Eduardo')
    expect(sp.results.count()).toEqual(4)

    // Click back button to get back to the search for 'Eduardo'
    sp.backButton.click()
    expect(sp.input.getAttribute('value')).toEqual('field theories')
    expect(sp.results.count()).toEqual(10)

    // Click back button once more to get back to start
    sp.backButton.click()
    expect(sp.input.getAttribute('value')).toEqual('')
    expect(sp.results.count()).toEqual(0)
    expect(sp.helpCard.isDisplayed()).toBeTruthy()

    // Since we are at the start, we expect the back button to no longer be visible
    expect(sp.backButton.isDisplayed()).toBeFalsy()
  });

  it('should have a clear button', function() {

    // Open the search page
    var sp = new SearchPage()
    sp.get()

    // Search for 'field theories'
    sp.searchFor('field theories')
    expect(sp.results.count()).toEqual(10)

    // Click the clear button
    sp.clearSearchButton.click()
    expect(sp.results.count()).toEqual(0)
    expect(sp.input.getAttribute('value')).toEqual('')
  });


  it('should have a clear button that does not break history', function() {

    // Open the search page
    var sp = new SearchPage()
    sp.get()

    // Search for 'field theories'
    sp.searchFor('field theories')
    expect(sp.results.count()).toEqual(10)

    // Enter some more text to search for 'field theories Eduardo'
    sp.searchFor(' Eduardo', false)
    expect(sp.results.count()).toEqual(4)

    // Click the clear button
    sp.clearSearchButton.click()

    // Click back button to get back to the search for 'Eduardo'
    sp.backButton.click()
    expect(sp.input.getAttribute('value')).toEqual('field theories')
    expect(sp.results.count()).toEqual(10)
  });

});












    // expect(results.get(1).getText()).toContain('Julie Staurseth');

    // // element(by.css('[nav-bar=active] .menuToggleButton')).click();

    // element(by.css('[ui-sref="app.search"]')).click();

    // element(by.model('vm.state.query')).sendKeys('Julie');
    // element(by.model('vm.state.query')).sendKeys(protractor.Key.ENTER);


//    expect($('ion-side-menu').isDisplayed()).toBeTruthy();

    // element(by.model('todoList.todoText')).sendKeys('write first protractor test');
    // element(by.css('[value="add"]')).click();

    // var resultsList = element.all(by.repeater('book in vm.results'));
    // expect(resultsList.count()).toEqual(10);


    // // You wrote your first test, cross it off the list
    // todoList.get(2).element(by.css('input')).click();
    // var completedAmount = element.all(by.css('.done-true'));
    // expect(completedAmount.count()).toEqual(2);
