Automation module

Requirements 
- module has config
- config defines all opportunities about automation and what we can do
- UI loads all data from config
- avoid circular deps
- module has permission AUTOMATION_CAN_MANAGE AUTOMATION_CAN_VIEW 
- user can set automation rules in UI
  - it looks like this [When => event => action ] for some action we need data for example when task completed we need move task to specific column base on this requirements we need to have specific data structure to configure automation
  - UI looks like bellow
  When section
  [Module selector, event selector]
  Then section
  [Module selector, action selector, data selector for action]