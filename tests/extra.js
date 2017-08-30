QUnit.module("extra stuff")

// TODO test_selectdate

QUnit.test("MultiWidget and MultiValueField", 11, function() {
  var time = isomorph.time
  var ComplexWidget = forms.MultiWidget.extend({
    constructor: function(kwargs) {
      if (!(this instanceof ComplexWidget)) return new ComplexWidget(kwargs)
      var widgets = [
        forms.TextInput()
      , forms.SelectMultiple({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]})
      , forms.SplitDateTimeWidget()
      ]
      forms.MultiWidget.call(this, widgets, kwargs)
    }
  })
  ComplexWidget.prototype.decompress = function(value) {
    if (value) {
      var data = value.split(",")
      return [data[0], data[1].split(""), time.strpdate(data[2], "%Y-%m-%d %H:%M:%S")]
    }
    return [null, null, null]
  }
  ComplexWidget.prototype.formatOutput = function(renderedWidgets) {
    return React.createElement('div', {"className": "complex"}, renderedWidgets)
  }

  var w = ComplexWidget()
  reactHTMLEqual(w.render("name", "some text,JP,2007-04-25 06:24:00"),
'<div class="complex"><input type="text" name="name_0" data-newforms-field="name" value="some text"/><select name="name_1" multiple="" data-newforms-field="name">\
<option selected="" value="J">John</option>\
<option selected="" value="P">Paul</option>\
<option value="G">George</option>\
<option value="R">Ringo</option>\
</select>\
<div>\
<input type="text" name="name_2_0" data-newforms-field="name" value="2007-04-25"/>\
<input type="text" name="name_2_1" data-newforms-field="name" value="06:24:00"/>\
</div>\
</div>')

  var ComplexField = forms.MultiValueField.extend({
    constructor: function(kwargs) {
      if (!(this instanceof ComplexField)) return new ComplexField(kwargs)
      kwargs.fields = [
        forms.CharField()
      , forms.MultipleChoiceField({choices: [["J", "John"], ["P", "Paul"], ["G", "George"], ["R", "Ringo"]]})
      , forms.SplitDateTimeField()
      ]
      forms.MultiValueField.call(this, kwargs)
    }
  })
  ComplexField.prototype.compress = function(dataList) {
    if (dataList instanceof Array && dataList.length > 0) {
      return [dataList[0],
              dataList[1].join(""),
              time.strftime(dataList[2], "%Y-%m-%d %H:%M:%S")].join(",")
    }
    return null
  }

  var f = ComplexField({widget: w})
  equal(f.clean(["some text", ["J", "P"], ["2007-04-25", "6:24:00"]]),
        "some text,JP,2007-04-25 06:24:00")
  cleanErrorEqual(f, "Select a valid choice. X is not one of the available choices.",
                  ["some text", ["X"], ["2007-04-25", "6:24:00"]])

  // If insufficient data is provided, null is substituted
  cleanErrorEqual(f, "This field is required.", ["some text", ["JP"]])

  // Test with no initial data
  strictEqual(f._hasChanged(null, ["some text", ["J", "P"], ["2007-04-25","6:24:00"]]), true)
  // Test when data is the same as initial
  strictEqual(f._hasChanged("some text,JP,2007-04-25 06:24:00",
                            ["some text", ["J", "P"], ["2007-04-25","6:24:00"]]), false)
  // Test when the first widget's data has changed
  strictEqual(f._hasChanged("some text,JP,2007-04-25 06:24:00",
                            ["other text", ["J","P"], ["2007-04-25","6:24:00"]]), true)
  // Test when the last widget's data has changed. This ensures that it is
  // not short circuiting while testing the widgets.
  strictEqual(f._hasChanged("some text,JP,2007-04-25 06:24:00",
                            ["some text", ["J","P"], ["2009-04-25","11:44:00"]]), true)

  var ComplexFieldForm = forms.Form.extend({
    field1: ComplexField({widget: w})
  })
  f = new ComplexFieldForm()
  reactHTMLEqual(React.createElement(forms.RenderForm, {form: f}),
'<div>\
<div>\
<label for="id_field1_0">Field1:</label> \
<div class="complex">\
<input type="text" name="field1_0" data-newforms-field="field1" id="id_field1_0"/>\
<select name="field1_1" multiple="" data-newforms-field="field1" id="id_field1_1">\
<option value="J">John</option>\
<option value="P">Paul</option>\
<option value="G">George</option>\
<option value="R">Ringo</option>\
</select>\
<div>\
<input type="text" name="field1_2_0" data-newforms-field="field1" id="id_field1_2_0"/>\
<input type="text" name="field1_2_1" data-newforms-field="field1" id="id_field1_2_1"/>\
</div></div>\
</div></div>')

  f = new ComplexFieldForm({data: {field1_0: "some text", field1_1 :["J", "P"], field1_2_0: "2007-04-25", field1_2_1: "06:24:00"}})
  reactHTMLEqual(React.createElement(forms.RenderForm, {form: f}),
'<div><div>\
<label for="id_field1_0">Field1:</label> \
<div class="complex">\
<input type="text" name="field1_0" data-newforms-field="field1" id="id_field1_0" value="some text"/>\
<select name="field1_1" multiple="" data-newforms-field="field1" id="id_field1_1">\
<option selected="" value="J">John</option>\
<option selected="" value="P">Paul</option>\
<option value="G">George</option>\
<option value="R">Ringo</option>\
</select>\
<div>\
<input type="text" name="field1_2_0" data-newforms-field="field1" id="id_field1_2_0" value="2007-04-25"/>\
<input type="text" name="field1_2_1" data-newforms-field="field1" id="id_field1_2_1" value="06:24:00"/>\
</div></div>\
</div></div>')

  equal(f.cleanedData["field1"], "some text,JP,2007-04-25 06:24:00")
})

QUnit.test("Extra attrs", 1, function() {
  var extraAttrs = {"className": "special"}
  var TestForm = forms.Form.extend({
    f1: forms.CharField({maxLength: 10, widget: new forms.TextInput({attrs: extraAttrs})})
  , f2: forms.CharField({widget: forms.TextInput({attrs: extraAttrs})})
  })

  reactHTMLEqual(React.createElement(forms.RenderForm, {form: TestForm, autoId: false}),
'<div>\
<div>F1: <input class="special" maxlength="10" type="text" name="f1"/></div>\
<div>F2: <input class="special" type="text" name="f2"/></div>\
</div>')
})

QUnit.test("Data field", 2, function() {
  var DataForm = forms.Form.extend({
    data: forms.CharField({maxLength: 10})
  })

  var f = new DataForm({data: {data: "xyzzy"}})
  strictEqual(f.isValid(), true)
  deepEqual(f.cleanedData, {data: "xyzzy"})
})

QUnit.test("Forms with *only* hidden fields", 1, function() {
  //  A form with *only* hidden fields that has errors is going to be very
  // unusual.
  var HiddenForm = forms.Form.extend({
    data: forms.IntegerField({widget: forms.HiddenInput})
  })
  var f = new HiddenForm({data: {}})
  reactHTMLEqual(React.createElement(forms.RenderForm, {form: f}),
'<div><div>\
<ul class="errorlist">\
<li>(Hidden field data) This field is required.</li>\
</ul>\
</div>\
<div style="display:none;">\
<input type="hidden" name="data" id="id_data" value=""/>\
</div></div>')
})

QUnit.test("SlugField normalisation", 1, function() {
  var f = forms.SlugField()
  equal(f.clean('    aa-bb-cc    '), 'aa-bb-cc')
})

QUnit.test("URLField normalisation", 1, function() {
  var f = forms.URLField()
  equal(f.clean('http://example.com/     '), 'http://example.com/')
})
