// src/utils/statusMapping.ts

// Key = simplified status from the frontend
// Value = array of possible statuses in the DB
export const statusMapping: Record<string, string[]> = {
  introduced: ['introduced'],
  passed: [
    'conference_passed_house',
    'conference_passed_senate',
    // 'fail_originating_house',
    // 'fail_originating_senate',
    // 'fail_second_house',
    // 'fail_second_senate',
    // 'override_pass_over_house',
    // 'pass_back_house',
    // 'pass_back_senate',
    'passed_bill',
    'passed_concurrentres',
    'passed_simpleres',
    // 'pass_over_house',
    // 'pass_over_senate',
    // 'prov_kill_cloturefailed',
    // 'prov_kill_pingpongfail',
    // 'prov_kill_suspensionfailed',
  ],
  enacted: ['enacted_signed', 'enacted_tendayrule', 'enacted_veto_override'],
};
