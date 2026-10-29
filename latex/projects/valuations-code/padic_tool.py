if __name__ == '__main__':
    print("This tool to evaluate the first `n` coefficients of the p-adic for a rational number `a/b`")

# Enter the numerator of the fraction
    loop = True
    while loop:
        try:
            a = int(input("Enter the numerator of the fraction 'a':"))
            loop = False
        except ValueError:
            print("Please enter an integer value!")

# Enter the denominator of the fraction
    loop = True
    while loop:
        try:
            b = int(input("Enter the denominator of the fraction 'b':"))
            if b == 0:
                print("The denominator cannot be 0!")
            else:
                loop = False
        except ValueError:
            print("Please enter an integer value!")
    d = b

# Enter the prime p for the p-adic
    loop = True
    while loop:
        try:
            p = int(input("Enter the 'p' value:"))
            if p < 2 or any(p % q == 0 for q in range(2, int(p**0.5) + 1)):
                print("'p' must be a prime number!")
            else:
                loop = False
        except ValueError:
            print("PLease enter an integer value!")

# Enter the number of coefficients
    loop = True
    while loop:
        try:
            n = int(input("Enter a positive 'n' for the number of coefficients you want to evaluate:"))
            if n < 1:
                print("Please enter a positive integer! ")
            else:
                loop = False
        except ValueError:
            print("Please enter a positive integer! ")
    c = int(a)
    if a == 0:
        print("0 is 0 in every p-adic: all its coefficients are 0.")
        raise SystemExit

# The following code is to find the equivalent simplified fraction of a/b as r/s
    r = a
    s = b
    if r < 0:
        r = -r
    if s < 0:
        s = -s
    if r >= s:
        while r % s !=0:
            A = r
            B = s
            while A % B !=0:
                r = B
                s = A % B
                break
        g = s
    if s >= r:
        while s % r != 0:
            A = r
            B = s
            while B % A != 0:
                s = A
                r = B % A
                break
        g = r
#___________________________________________
# The following two while's are to make count the p powers in a and b then clear them of it
    k = 0
    while a % p**(k+1) == 0:
        k = k + 1
    a = a // p**k

    l = 0
    while b % p**(l+1) == 0:
        l = l + 1
    b = b // p**l
# The following variable "m" is max power of p that divides a/b
    m = k - l

# The result stand for the evaluated p-adic and j for the counter for the number of coefficients
    result = ""
    j = 0


    while j < n:
        i = 0
        while i < p:
            if (a - i * b) % p == 0:
                a = (a - i * b) // p
                result = result + " " + str(int(i))
                break
            i = i + 1
        j = j + 1

#msg = str(`the first`, int(n),`,`, int(p), `-adic coefficients of` )
#msg += str(int(c), `/`, int(d), "=", int(r), `/`, int(s), `are`)
    print(".")
    print("The fraction", int(c), "/", int(d), " is equivalent to ", c // g, "/", d // g)

    print("The first", int(n), "coefficients of ", int(p), "-adic for", int(c), "/", int(d), "are")
    print(str(result))
    print("NOTE!: The first entry is the coefficient of p to the power", int(m))

