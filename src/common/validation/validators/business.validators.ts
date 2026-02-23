import { 
  ValidatorConstraint, 
  ValidatorConstraintInterface, 
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  isEmail,
  isPhoneNumber,
} from 'class-validator';

// Email validator with stricter rules
@ValidatorConstraint({ name: 'isSecureEmail', async: false })
export class IsSecureEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string) {
    // Basic email validation
    if (!isEmail(email)) {
      return false;
    }

    // Additional security checks
    const emailLower = email.toLowerCase();
    
    // Block disposable email domains (basic list)
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
    ];

    const domain = emailLower.split('@')[1];
    if (disposableDomains.some(disposable => domain.includes(disposable))) {
      return false;
    }

    // Check for suspicious patterns
    if (emailLower.includes('+') || emailLower.includes('..')) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Email must be valid and from a non-disposable domain';
  }
}

export function IsSecureEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureEmailConstraint,
    });
  };
}

// Phone number validator
@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's a valid phone number format
    return isPhoneNumber(cleanPhone, 'US') || 
           isPhoneNumber(cleanPhone, 'GB') || 
           isPhoneNumber(cleanPhone, 'DE') ||
           /^\+?[1-9]\d{1,14}$/.test(cleanPhone);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Phone number must be valid';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

// Monetary amount validator
@ValidatorConstraint({ name: 'isValidAmount', async: false })
export class IsValidAmountConstraint implements ValidatorConstraintInterface {
  validate(amount: number) {
    // Check if it's a valid number
    if (typeof amount !== 'number' || isNaN(amount)) {
      return false;
    }

    // Check if it's positive (or zero for some cases)
    if (amount < 0) {
      return false;
    }

    // Check for reasonable amount limits (up to 1 billion)
    if (amount > 1000000000) {
      return false;
    }

    // Check for reasonable decimal places (max 2 for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Amount must be a valid positive number with up to 2 decimal places';
  }
}

export function IsValidAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidAmountConstraint,
    });
  };
}

// Strong password validator
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    if (!password) {
      return false;
    }

    // Minimum length
    if (password.length < 8) {
      return false;
    }

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Must contain at least one number
    if (!/\d/.test(password)) {
      return false;
    }

    // Must contain at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }

    // Cannot contain common patterns
    const commonPatterns = [
      'password',
      '123456',
      'qwerty',
      'admin',
      'user',
    ];
    
    const passwordLower = password.toLowerCase();
    if (commonPatterns.some(pattern => passwordLower.includes(pattern))) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Policy number validator
@ValidatorConstraint({ name: 'isValidPolicyNumber', async: false })
export class IsValidPolicyNumberConstraint implements ValidatorConstraintInterface {
  validate(policyNumber: string) {
    if (!policyNumber) {
      return false;
    }

    // Remove spaces and convert to uppercase
    const cleanPolicyNumber = policyNumber.replace(/\s/g, '').toUpperCase();

    // Check format: POL-YYYY-XXXXXX (where X is alphanumeric)
    const policyRegex = /^POL-\d{4}-[A-Z0-9]{6}$/;
    return policyRegex.test(cleanPolicyNumber);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Policy number must be in format POL-YYYY-XXXXXX';
  }
}

export function IsValidPolicyNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPolicyNumberConstraint,
    });
  };
}

// Claim number validator
@ValidatorConstraint({ name: 'isValidClaimNumber', async: false })
export class IsValidClaimNumberConstraint implements ValidatorConstraintInterface {
  validate(claimNumber: string) {
    if (!claimNumber) {
      return false;
    }

    // Remove spaces and convert to uppercase
    const cleanClaimNumber = claimNumber.replace(/\s/g, '').toUpperCase();

    // Check format: CL-YYYY-XXXXXX (where X is alphanumeric)
    const claimRegex = /^CL-\d{4}-[A-Z0-9]{6}$/;
    return claimRegex.test(cleanClaimNumber);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Claim number must be in format CL-YYYY-XXXXXX';
  }
}

export function IsValidClaimNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidClaimNumberConstraint,
    });
  };
}

// Date range validator
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // For date range validation, we expect the decorator to be used on endDate
    // and the startDate should be available in the object
    const obj = args.object as any;
    
    if (!obj.startDate || !obj.endDate) {
      return true; // Let other validators handle required fields
    }

    const start = new Date(obj.startDate);
    const end = new Date(obj.endDate);

    // Start date must be before end date
    if (start >= end) {
      return false;
    }

    // Start date must not be too far in the past (more than 10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (start < tenYearsAgo) {
      return false;
    }

    // End date must not be too far in the future (more than 10 years)
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    if (end > tenYearsFromNow) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Start date must be before end date and within reasonable range';
  }
}

export function IsValidDateRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateRangeConstraint,
    });
  };
}
